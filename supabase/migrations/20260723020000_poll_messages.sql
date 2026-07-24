-- Contexto necessário pra decifrar votos de enquete do WhatsApp: o Baileys
-- exige a mensagem original de criação da enquete (com seu "message secret")
-- pra decifrar cada voto que chega depois via `messages.upsert`. Sem isso,
-- votos de enquete não podem ser capturados em `engagement_events`.
create table poll_messages (
  id uuid primary key default gen_random_uuid(),
  send_queue_id uuid not null references send_queue(id) on delete cascade,
  message_id text not null,
  remote_jid text not null,
  poll_creator_jid text not null,
  message_secret text not null,
  options jsonb not null,
  created_at timestamptz not null default now()
);

create unique index poll_messages_message_remote_idx on poll_messages (message_id, remote_jid);

alter table poll_messages enable row level security;

create policy authenticated_full_access on poll_messages
  for all to authenticated
  using (true)
  with check (true);
