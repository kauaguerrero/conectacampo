-- ============================================================================
-- DADOS MOCK PARA DEMONSTRAÇÃO AO CLIENTE
-- ============================================================================
-- Popula o dashboard inteiro (KPIs, gráficos, aprovações, calendário,
-- membros, reconhecimentos, templates, temas) com uma "Fazenda Modelo"
-- fictícia, pra ficar bonito numa demo sem mexer nos seus dados reais.
--
-- COMO RODAR: cole no SQL Editor do Supabase (ou `psql`) e execute inteiro.
-- Roda dentro de uma transação — se algo falhar no meio, nada fica gravado.
--
-- LIMPEZA: depois da demo, rode seed_demo_data_rollback.sql (mesmo arquivo
-- ao lado deste) pra apagar TODO esse conteúdo mock, sem tocar em nada real.
--
-- ATENÇÃO — grupos falsos e o worker:
-- Os 2 grupos abaixo têm `whatsapp_group_id` fictício (não existe no
-- WhatsApp de verdade), de propósito: se o processador de fila pegar algum
-- envio "approved" daqui, ele vai FALHAR ao mandar (JID inválido) em vez de
-- mandar mensagem de mentira pra um grupo real. Mesmo assim, enquanto esses
-- grupos existirem, a geração semanal automática (cron) também vai gerar
-- conteúdo pra eles, consumindo um pouco da sua cota diária do Gemini. Rode
-- o rollback logo após a demo, ou pause o worker durante a apresentação.
--
-- PRÉ-REQUISITO: todas as migrations em supabase/migrations/ já aplicadas
-- (precisa da coluna topics.is_search, da mais recente).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Grupos
-- ----------------------------------------------------------------------------
insert into groups (id, name, whatsapp_group_id, profile) values
  ('a0000000-0000-0000-0000-000000000001', '[DEMO] Operadores – Fazenda Modelo', 'demo-operador-000000000001@g.us', 'operador'),
  ('a0000000-0000-0000-0000-000000000002', '[DEMO] Tratoristas – Fazenda Modelo', 'demo-tratorista-000000000002@g.us', 'tratorista');

-- ----------------------------------------------------------------------------
-- Membros (7 por grupo — mistura de ativos/inativos, aniversários próximos,
-- membros "quietos" e membros bem engajados, pra popular todos os cards)
-- ----------------------------------------------------------------------------
insert into members (id, group_id, name, phone, birthday_date, active, created_at) values
  -- Operadores
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Carlos Eduardo Silva',    '5511999990001', (current_date + interval '4 days'  - interval '35 years')::date, true,  now() - interval '200 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Marcos Vinícius Oliveira','5511999990002', null,                                                                true,  now() - interval '180 days'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'José Roberto Santos',     '5511999990003', null,                                                                true,  now() - interval '220 days'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Antônio Ferreira Lima',   '5511999990004', (current_date + interval '15 days' - interval '41 years')::date, true,  now() - interval '150 days'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Paulo Henrique Costa',    '5511999990005', null,                                                                true,  now() - interval '300 days'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Ricardo Alves Souza',     '5511999990006', null,                                                                false, now() - interval '400 days'),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Fernando Gomes Pereira',  '5511999990007', (current_date + interval '24 days' - interval '29 years')::date, true,  now() - interval '90 days'),
  -- Tratoristas
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Juliana Aparecida Rocha', '5511999990008', (current_date + interval '1 days'  - interval '33 years')::date, true,  now() - interval '210 days'),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'Eduardo Martins Cardoso', '5511999990009', (current_date + interval '9 days'  - interval '27 years')::date, true,  now() - interval '190 days'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Sebastião Nunes Barbosa', '5511999990010', null,                                                                true,  now() - interval '240 days'),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'Wagner Luiz Teixeira',    '5511999990011', null,                                                                true,  now() - interval '160 days'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'Roberto Carlos Mendes',   '5511999990012', null,                                                                true,  now() - interval '270 days'),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 'Diego Fernandes Araújo',  '5511999990013', null,                                                                true,  now() - interval '100 days'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', 'Vanderlei José Ramos',    '5511999990014', null,                                                                false, now() - interval '500 days');

-- ----------------------------------------------------------------------------
-- Templates
-- ----------------------------------------------------------------------------
insert into templates (id, name, type, content) values
  ('c0000000-0000-0000-0000-000000000001', 'Lembrete de EPI', 'texto',
    '{"text": "🦺 *EPI completo antes de subir na máquina!*\n\nBotina, luva e óculos de proteção são obrigatórios em qualquer operação. Não é regra por regra — é o que te leva pra casa inteiro no fim do dia.\n\nQuem já conferiu o kit hoje, responde com 👍!"}'::jsonb),
  ('c0000000-0000-0000-0000-000000000002', 'Parabéns de aniversário', 'reconhecimento',
    '{"text": "🎉 *Hoje é dia de comemorar!*\n\nParabéns, {{nome}}! Mais um ano de dedicação e trabalho bem feito com a gente. Que venham muitas safras boas pela frente!\n\nManda um 🎂 pra ele(a) aí no grupo!"}'::jsonb),
  ('c0000000-0000-0000-0000-000000000003', 'Enquete de manutenção', 'enquete',
    '{"question": "Qual equipamento precisa de manutenção essa semana?", "options": ["Colhedora", "Trator", "Pulverizador", "Nenhum, tudo em dia"]}'::jsonb);

-- ----------------------------------------------------------------------------
-- Temas (pra tela /temas — inclui um marcado como "busca", ver news.ts)
-- ----------------------------------------------------------------------------
insert into topics (id, title, description, priority, last_used_at, is_search) values
  ('d0000000-0000-0000-0000-000000000001', 'Manutenção preventiva de colhedoras', 'Checklist antes da safra: correias, facas de corte, sistema hidráulico.', false, now() - interval '6 days', false),
  ('d0000000-0000-0000-0000-000000000002', 'Segurança na operação com implementos', null, false, now() - interval '13 days', false),
  ('d0000000-0000-0000-0000-000000000003', 'Novidades do agro', 'máquinas agrícolas, safra, clima, mercado — Brasil', false, null, true),
  ('d0000000-0000-0000-0000-000000000004', 'Cuidados com pneus e rodados', 'Calibragem correta evita desgaste irregular e economiza combustível.', true, now() - interval '20 days', false);

-- ----------------------------------------------------------------------------
-- Fila de envio: ENVIADAS (últimos 30 dias) — alimenta KPIs de engajamento,
-- entrega, comparativo por grupo e por tipo de conteúdo.
-- ----------------------------------------------------------------------------
insert into send_queue (id, group_id, template_id, content, original_content, source, status, scheduled_for, sent_at, ai_feedback, created_at) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
    '{"type": "text", "text": "🦺 *EPI completo antes de subir na máquina!*\n\nBotina, luva e óculos de proteção são obrigatórios em qualquer operação. Não é regra por regra — é o que te leva pra casa inteiro no fim do dia.\n\nQuem já conferiu o kit hoje, responde com 👍!"}'::jsonb,
    null, 'manual', 'sent', now() - interval '2 days', now() - interval '2 days', null, now() - interval '2 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "🔧 *Revisão da colhedora antes da safra!*\n\nCorreias, facas de corte e sistema hidráulico merecem uma olhada com calma essa semana. Um problema pego agora custa muito menos que uma parada no meio da lavoura.\n\nJá deu uma olhada na sua máquina? Manda um 🙌 quem já revisou!"}'::jsonb,
    '{"type": "text", "text": "🔧 *Revisão da colhedora antes da safra!*\n\nCorreias, facas de corte e sistema hidráulico merecem uma olhada com calma essa semana. Um problema pego agora custa muito menos que uma parada no meio da lavoura.\n\nJá deu uma olhada na sua máquina? Manda um 🙌 quem já revisou!"}'::jsonb,
    'ai_generated', 'sent', now() - interval '4 days', now() - interval '4 days', 'positive', now() - interval '4 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "⚠️ *Cuidado redobrado na plataforma de corte!*\n\nAntes de qualquer ajuste ou desentupimento, desligue o motor e espere a plataforma parar completamente. Segundo que corre é segundo de risco.\n\nAlguma dúvida sobre o procedimento? Pode perguntar aqui no grupo!"}'::jsonb,
    '{"type": "text", "text": "⚠️ *Cuidado na plataforma de corte!*\n\nDesligue o motor antes de mexer. Segurança em primeiro lugar.\n\nDúvidas? Chama aqui!"}'::jsonb,
    'ai_generated', 'sent', now() - interval '6 days', now() - interval '6 days', 'medium', now() - interval '6 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
    '{"type": "poll", "question": "Qual equipamento precisa de manutenção essa semana?", "options": ["Colhedora", "Trator", "Pulverizador", "Nenhum, tudo em dia"]}'::jsonb,
    null, 'manual', 'sent', now() - interval '8 days', now() - interval '8 days', null, now() - interval '8 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "Bom dia, pessoal! ☀️ Semana cheia pela frente, capricho na inspeção diária antes de sair pro talhão. Bora com tudo!"}'::jsonb,
    null, 'manual', 'sent', now() - interval '10 days', now() - interval '10 days', null, now() - interval '10 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "🌱 *Solo bem preparado rende mais safra!*\n\nUma checagem rápida da umidade e da compactação antes do plantio evita retrabalho lá na frente. Vale os 10 minutos a mais.\n\nQuem confere isso antes de começar, levanta a mão 🙋!"}'::jsonb,
    '{"type": "text", "text": "🌱 *Solo bem preparado rende mais safra!*\n\nUma checagem rápida da umidade e da compactação antes do plantio evita retrabalho lá na frente. Vale os 10 minutos a mais.\n\nQuem confere isso antes de começar, levanta a mão 🙋!"}'::jsonb,
    'ai_generated', 'sent', now() - interval '14 days', now() - interval '14 days', 'positive', now() - interval '14 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
    '{"type": "text", "text": "🎉 *Hoje é dia de comemorar!*\n\nParabéns, Juliana! Mais um ano de dedicação e trabalho bem feito com a gente. Que venham muitas safras boas pela frente!\n\nManda um 🎂 pra ela aí no grupo!"}'::jsonb,
    null, 'manual', 'sent', now() - interval '3 days', now() - interval '3 days', null, now() - interval '3 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', null,
    '{"type": "text", "text": "🚜 *Trator parado é prejuízo!*\n\nUma checagem rápida no filtro de ar e no nível de óleo antes de ligar evita dor de cabeça no meio do dia. Simples e rápido.\n\nJá conferiu o seu hoje? Responde com 👍!"}'::jsonb,
    '{"type": "text", "text": "🚜 *Trator parado é prejuízo!*\n\nUma checagem rápida no filtro de ar e no nível de óleo antes de ligar evita dor de cabeça no meio do dia. Simples e rápido.\n\nJá conferiu o seu hoje? Responde com 👍!"}'::jsonb,
    'ai_generated', 'sent', now() - interval '5 days', now() - interval '5 days', 'positive', now() - interval '5 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003',
    '{"type": "poll", "question": "Qual trator está precisando de atenção?", "options": ["Trator 1", "Trator 2", "Trator 3", "Nenhum"]}'::jsonb,
    null, 'manual', 'sent', now() - interval '9 days', now() - interval '9 days', null, now() - interval '9 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', null,
    '{"type": "text", "text": "🔩 *Pneus calibrados, trabalho mais leve!*\n\nPneu murcho gasta mais combustível e desgasta irregular. Um minuto com o calibrador economiza no fim do mês.\n\nJá calibrou essa semana? Responde aqui!"}'::jsonb,
    '{"type": "text", "text": "🔩 *Calibragem dos pneus!*\n\nPneu murcho gasta mais combustível. Confere aí.\n\nJá fez?"}'::jsonb,
    'ai_generated', 'sent', now() - interval '12 days', now() - interval '12 days', 'medium', now() - interval '12 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', null,
    '{"type": "text", "text": "Pessoal, lembrando que sexta-feira tem reunião rápida antes do turno. Chegar 10 minutos antes, por favor! 🙏"}'::jsonb,
    null, 'manual', 'sent', now() - interval '18 days', now() - interval '18 days', null, now() - interval '18 days' - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', null,
    '{"type": "text", "text": "🌾 *Chuva chegando, atenção no talhão!*\n\nPrevisão indica chuva forte pro fim de semana — vale adiantar o que dá antes que o solo encharque. Planejamento evita atraso.\n\nAlguém já ajustou a programação? Conta aqui!"}'::jsonb,
    '{"type": "text", "text": "🌾 *Chuva chegando, atenção no talhão!*\n\nPrevisão indica chuva forte pro fim de semana — vale adiantar o que dá antes que o solo encharque. Planejamento evita atraso.\n\nAlguém já ajustou a programação? Conta aqui!"}'::jsonb,
    'ai_generated', 'sent', now() - interval '22 days', now() - interval '22 days', 'positive', now() - interval '22 days' - interval '1 hour');

-- ----------------------------------------------------------------------------
-- Fila de envio: FALHADAS — 2 rejeitadas pelo instrutor (IA, attempts=0) e
-- 1 falha real de entrega (attempts esgotados), pra taxa de entrega/aprovação
-- de IA não ficarem 100% (mais realista pra demo).
-- ----------------------------------------------------------------------------
insert into send_queue (id, group_id, template_id, content, original_content, source, status, scheduled_for, attempts, error_message, ai_feedback, created_at) values
  ('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "🐛 *Praga na lavoura, fique de olho!*\n\nQualquer sinal de folha comida ou inseto estranho, avisa o responsável técnico na hora.\n\nViu algo diferente? Manda foto aqui!"}'::jsonb,
    '{"type": "text", "text": "🐛 *Praga na lavoura, fique de olho!*\n\nQualquer sinal de folha comida ou inseto estranho, avisa o responsável técnico na hora.\n\nViu algo diferente? Manda foto aqui!"}'::jsonb,
    'ai_generated', 'failed', now() - interval '7 days', 0, null, 'negative', now() - interval '7 days'),

  ('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000002', null,
    '{"type": "text", "text": "📋 *Checklist antes de ligar o trator!*\n\nÓleo, água, pneus e freio — 5 minutinhos que evitam parada no meio do serviço.\n\nJá virou rotina pra você?"}'::jsonb,
    '{"type": "text", "text": "📋 *Checklist antes de ligar o trator!*\n\nÓleo, água, pneus e freio — 5 minutinhos que evitam parada no meio do serviço.\n\nJá virou rotina pra você?"}'::jsonb,
    'ai_generated', 'failed', now() - interval '15 days', 0, null, 'negative', now() - interval '15 days'),

  ('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "Aviso: entrega de peças chega amanhã de manhã no galpão 2."}'::jsonb,
    null, 'manual', 'failed', now() - interval '20 days', 3, 'WhatsApp não confirmou o envio (sem message key).', null, now() - interval '20 days');

-- ----------------------------------------------------------------------------
-- Fila de envio: APROVADAS (agendadas pro futuro próximo) — card "Próximos
-- envios" da home. Ver aviso no topo do arquivo sobre grupos falsos.
-- ----------------------------------------------------------------------------
insert into send_queue (id, group_id, template_id, content, source, status, scheduled_for, created_at) values
  ('e0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', null,
    '{"type": "text", "text": "🔧 *Hora da manutenção semanal!*\n\nSepara um tempinho hoje pra passar o pente fino nos itens críticos: freios, luzes e nível de óleo.\n\nBora manter tudo em dia! 👊"}'::jsonb,
    'ai_generated', 'approved', now() + interval '3 hours', now() - interval '3 hours'),

  ('e0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000002', null,
    '{"type": "text", "text": "Lembrete: amanhã tem entrega de fertilizante às 7h no depósito central. Quem puder ajudar no descarregamento, chega uns minutinhos antes!"}'::jsonb,
    'manual', 'approved', now() + interval '5 hours', now() - interval '1 hours'),

  ('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',
    '{"type": "poll", "question": "Como está o andamento da colheita essa semana?", "options": ["Adiantada", "No prazo", "Atrasada por chuva", "Atrasada por manutenção"]}'::jsonb,
    'ai_generated', 'approved', now() + interval '1 day', now() - interval '2 hours');

-- ----------------------------------------------------------------------------
-- Fila de envio: PENDENTES DE APROVAÇÃO — pra tela /aprovacoes.
-- ----------------------------------------------------------------------------
insert into send_queue (id, group_id, content, original_content, source, status, scheduled_for, created_at) values
  ('e0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001',
    '{"type": "text", "text": "🌡️ *Calor extremo pede mais cuidado!*\n\nHidrate-se com frequência e evite operar no horário de pico de sol sem necessidade. Seu corpo também precisa de manutenção.\n\nTodo mundo levando água pro campo? 💧"}'::jsonb,
    '{"type": "text", "text": "🌡️ *Calor extremo pede mais cuidado!*\n\nHidrate-se com frequência e evite operar no horário de pico de sol sem necessidade. Seu corpo também precisa de manutenção.\n\nTodo mundo levando água pro campo? 💧"}'::jsonb,
    'ai_generated', 'pending_approval', now() + interval '6 hours', now() - interval '2 hours'),

  ('e0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000002',
    '{"type": "text", "text": "🚜 *Troca de óleo em dia rende motor mais vivo!*\n\nSe já passou das horas recomendadas pelo manual, não deixa pra depois — motor seco é motor fritando.\n\nAlguém já trocou esse mês?"}'::jsonb,
    '{"type": "text", "text": "🚜 *Troca de óleo em dia rende motor mais vivo!*\n\nSe já passou das horas recomendadas pelo manual, não deixa pra depois — motor seco é motor fritando.\n\nAlguém já trocou esse mês?"}'::jsonb,
    'ai_generated', 'pending_approval', now() + interval '8 hours', now() - interval '5 hours'),

  ('e0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001',
    '{"type": "text", "text": "🌾 *Ajuste fino na debulhadora evita perda de grão!*\n\nUma regulagem rápida antes de começar já garante menos grão no chão e mais na tulha.\n\nJá regulou a sua hoje?"}'::jsonb,
    '{"type": "text", "text": "🌾 *Ajuste fino na debulhadora evita perda de grão!*\n\nUma regulagem rápida antes de começar já garante menos grão no chão e mais na tulha.\n\nJá regulou a sua hoje?"}'::jsonb,
    'ai_generated', 'pending_approval', now() + interval '1 day', now() - interval '1 day');

-- ----------------------------------------------------------------------------
-- Eventos de engajamento — respostas/reações dentro da janela de 24h de cada
-- envio (KPI de taxa de resposta/reação), votos nas 2 enquetes, mais alguns
-- eventos avulsos pra montar o ranking de mais engajados e o card de
-- "quem anda quieto" (Sebastião com atividade há 70 dias; José, Paulo e
-- Roberto nunca engajaram).
-- ----------------------------------------------------------------------------
insert into engagement_events (group_id, member_id, send_queue_id, type, created_at) values
  -- e01
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'reply',     now() - interval '2 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'reaction',  now() - interval '2 days' + interval '3 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'reaction',  now() - interval '2 days' + interval '4 hours'),
  -- e02
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'reply',     now() - interval '4 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'reaction',  now() - interval '4 days' + interval '3 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'reaction',  now() - interval '4 days' + interval '5 hours'),
  -- e03
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'reaction',  now() - interval '6 days' + interval '1 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 'reply',     now() - interval '6 days' + interval '2 hours'),
  -- e04 (enquete)
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'poll_vote', now() - interval '8 days' + interval '1 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'poll_vote', now() - interval '8 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'poll_vote', now() - interval '8 days' + interval '3 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000004', 'poll_vote', now() - interval '8 days' + interval '4 hours'),
  -- e05
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 'reaction',  now() - interval '10 days' + interval '2 hours'),
  -- e06
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 'reply',     now() - interval '14 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000006', 'reaction',  now() - interval '14 days' + interval '3 hours'),
  -- e07 (reconhecimento aniversário Juliana)
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000007', 'reply',     now() - interval '3 days' + interval '1 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000007', 'reaction',  now() - interval '3 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000007', 'reaction',  now() - interval '3 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000007', 'reaction',  now() - interval '3 days' + interval '3 hours'),
  -- e08
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000008', 'reply',     now() - interval '5 days' + interval '1 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000008', 'reaction',  now() - interval '5 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000008', 'reaction',  now() - interval '5 days' + interval '3 hours'),
  -- e09 (enquete)
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000009', 'poll_vote', now() - interval '9 days' + interval '1 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000009', 'poll_vote', now() - interval '9 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000009', 'poll_vote', now() - interval '9 days' + interval '3 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000009', 'poll_vote', now() - interval '9 days' + interval '4 hours'),
  -- e10
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000010', 'reply',     now() - interval '12 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000010', 'reaction',  now() - interval '12 days' + interval '3 hours'),
  -- e11
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000011', 'reaction',  now() - interval '18 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000011', 'reaction',  now() - interval '18 days' + interval '3 hours'),
  -- e12
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000012', 'reply',     now() - interval '22 days' + interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000012', 'reply',     now() - interval '22 days' + interval '3 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000012', 'reaction',  now() - interval '22 days' + interval '4 hours'),
  -- extras avulsos (sem post associado) — deixam Juliana em 1º no ranking e
  -- alimentam mais alguns dias da linha do tempo de atividade
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', null, 'reaction', now() - interval '1 days'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', null, 'reply',    now() - interval '6 days'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', null, 'reaction', now() - interval '2 days'),
  -- Sebastião: única atividade há 70 dias, fora da janela de 60 dias — aparece
  -- em "Quem anda quieto"
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', null, 'reaction', now() - interval '70 days');

-- ----------------------------------------------------------------------------
-- Reconhecimentos pendentes — card da home + tela /reconhecimentos
-- ----------------------------------------------------------------------------
insert into recognitions (group_id, member_id, type, note, scheduled_for, sent) values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'aniversario', null, now() + interval '4 days', false),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 'aniversario', null, now() + interval '1 days', false),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'marco_seguranca', '6 meses sem acidentes', now() - interval '2 days', false),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000009', 'destaque', 'Melhor produtividade do mês', now() + interval '3 days', false);

commit;
