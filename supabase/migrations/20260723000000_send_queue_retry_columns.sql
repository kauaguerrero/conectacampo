-- Colunas de controle de retry para o processador da fila de envio (worker).
-- attempts: quantas tentativas de envio já foram feitas.
-- next_attempt_at: quando a próxima tentativa pode ocorrer (backoff exponencial).
--   NULL significa "sem retry pendente" (ainda não tentou ou já esgotou tentativas).

alter table send_queue
  add column attempts int not null default 0,
  add column next_attempt_at timestamptz;
