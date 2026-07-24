-- Temas de conteúdo cadastrados pelo instrutor para orientar a geração de
-- conteúdo via Gemini. `priority = true` marca um tema para ser usado no
-- próximo envio gerado (fura a fila); o worker zera a flag após usá-lo.
create table topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table topics enable row level security;

create policy authenticated_full_access on topics
  for all to authenticated
  using (true)
  with check (true);
