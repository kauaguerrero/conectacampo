-- Configurações globais do app (linha única). Hoje só guarda em qual dia da
-- semana o worker deve gerar conteúdo por IA para a semana (0=domingo ...
-- 6=sábado) — antes era fixo em domingo, agora o instrutor escolhe.
create table app_settings (
  id boolean primary key default true,
  generation_weekday smallint not null default 0,
  constraint app_settings_singleton check (id),
  constraint app_settings_weekday_range check (generation_weekday between 0 and 6)
);

insert into app_settings (id, generation_weekday) values (true, 0);

alter table app_settings enable row level security;

create policy authenticated_full_access on app_settings
  for all to authenticated
  using (true)
  with check (true);
