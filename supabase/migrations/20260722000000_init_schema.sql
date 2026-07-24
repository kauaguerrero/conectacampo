-- Schema inicial — Comunidade WhatsApp Alta Mogiana
-- Ver PROJECT_BRIEF.md seção 4 para o desenho conceitual.

create extension if not exists pgcrypto;

create type group_profile as enum ('operador', 'tratorista');
create type template_type as enum ('texto', 'reconhecimento', 'enquete');
create type send_source as enum ('manual', 'ai_generated');
create type send_status as enum ('pending_approval', 'approved', 'sent', 'failed');
create type engagement_type as enum ('reply', 'reaction', 'poll_vote');
create type recognition_type as enum ('aniversario', 'destaque', 'marco_seguranca');

-- grupos (operador / tratorista)
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_group_id text not null unique,
  profile group_profile not null,
  created_at timestamptz not null default now()
);

-- membros (para relatórios de engajamento e reconhecimento)
create table members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  phone text not null,
  birthday_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index members_group_id_idx on members(group_id);

-- modelos de mensagem (blocos reutilizáveis pelo instrutor)
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type template_type not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- fila de envio (todo envio passa por aqui, manual ou gerado por IA)
create table send_queue (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  content jsonb not null,
  source send_source not null,
  status send_status not null default 'pending_approval',
  scheduled_for timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);
create index send_queue_group_id_idx on send_queue(group_id);
-- índice usado pelo worker: polling de itens aprovados prontos para envio
create index send_queue_pending_send_idx on send_queue(status, scheduled_for)
  where status = 'approved';

-- eventos de engajamento capturados pelo worker
create table engagement_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  send_queue_id uuid references send_queue(id) on delete set null,
  type engagement_type not null,
  content text,
  created_at timestamptz not null default now()
);
create index engagement_events_group_id_idx on engagement_events(group_id);
create index engagement_events_send_queue_id_idx on engagement_events(send_queue_id);

-- reconhecimentos (cadastro manual do instrutor)
create table recognitions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  type recognition_type not null,
  note text,
  scheduled_for timestamptz not null,
  sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index recognitions_group_id_idx on recognitions(group_id);
create index recognitions_pending_idx on recognitions(scheduled_for) where sent = false;

-- Row Level Security
-- Ferramenta interna de tenant único: o worker acessa via service_role (que
-- ignora RLS) e o dashboard acessa via usuário autenticado do instrutor.
-- Política permissiva para "authenticated" é suficiente aqui; sem policy para
-- "anon", então chamadas não autenticadas ficam bloqueadas por padrão.
alter table groups enable row level security;
alter table members enable row level security;
alter table templates enable row level security;
alter table send_queue enable row level security;
alter table engagement_events enable row level security;
alter table recognitions enable row level security;

create policy "authenticated_full_access" on groups
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on members
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on templates
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on send_queue
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on engagement_events
  for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on recognitions
  for all to authenticated using (true) with check (true);
