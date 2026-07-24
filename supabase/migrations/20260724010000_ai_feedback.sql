-- Flywheel de feedback da IA: cada mensagem gerada guarda o texto original
-- (pra comparar com o que foi de fato aprovado) e o resultado da decisão do
-- instrutor, usado depois como exemplo few-shot pro Gemini.
alter table send_queue
  add column original_content jsonb,
  add column ai_feedback text check (ai_feedback in ('positive', 'medium', 'negative'));

-- positive = aprovou sem editar | medium = editou antes de aprovar | negative = descartou

-- Modo de aprendizado configurável: "simples" (few-shot com as últimas
-- mensagens bem avaliadas) ou "robusto" (busca semântica — ainda não
-- implementado, o switch já existe pra quando a base de dados crescer).
alter table app_settings
  add column generation_mode text not null default 'simples' check (generation_mode in ('simples', 'robusto'));
