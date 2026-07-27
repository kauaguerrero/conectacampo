-- Permite marcar um tema como "de busca": ao ser selecionado, o worker liga
-- o grounding do Gemini (Google Search) pra escrever sobre uma novidade/
-- notícia atual do agro em vez de um assunto fixo cadastrado manualmente.
alter table topics add column is_search boolean not null default false;
