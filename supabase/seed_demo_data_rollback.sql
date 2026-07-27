-- ============================================================================
-- ROLLBACK dos dados mock de demonstração (seed_demo_data.sql)
-- ============================================================================
-- Apaga só o que foi criado pelo seed: os 2 grupos "[DEMO]" e tudo que
-- referencia eles em cascata (members, send_queue, poll_messages,
-- engagement_events, recognitions), mais os templates e temas mock
-- (não têm relação com grupo, por isso saem à parte). Não toca em nenhum
-- dado real — os deletes são só pelos IDs fixos usados no seed.
-- ============================================================================

begin;

-- Apaga os grupos demo — cascade cuida de: members, send_queue (e
-- poll_messages via send_queue), engagement_events e recognitions.
delete from groups where id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002'
);

-- Templates e temas mock (não são filhos de groups, apagados à parte).
delete from templates where id in (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003'
);

delete from topics where id in (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000004'
);

commit;
