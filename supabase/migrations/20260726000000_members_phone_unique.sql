-- O worker agora auto-cadastra membros a partir de eventos de engajamento
-- (resposta/reação/voto de quem ainda não estava em `members`). Essa
-- constraint evita duplicar o mesmo número quando duas mensagens da mesma
-- pessoa chegam quase juntas (corrida entre dois inserts concorrentes) — o
-- worker trata a violação e reaproveita o membro já criado nesse caso.
alter table members add constraint members_group_id_phone_key unique (group_id, phone);
