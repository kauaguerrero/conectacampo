-- Manuais técnicos (PDF) enviados pelo instrutor pra servir de referência real
-- pra IA na geração de conteúdo. Cada documento é marcado com o equipamento a
-- que se refere (texto livre, ex: "Colhedora CH570"); na geração, se o tema
-- selecionado mencionar esse equipamento, o worker anexa o PDF inteiro na
-- chamada ao Gemini (ele lê PDF nativamente) — sem chunking/embeddings, dado
-- o volume baixo de documentos esperado.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "authenticated_full_access_documents_bucket"
on storage.objects for all
to authenticated
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment text not null,
  file_path text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

alter table documents enable row level security;

create policy authenticated_full_access on documents
  for all to authenticated
  using (true)
  with check (true);
