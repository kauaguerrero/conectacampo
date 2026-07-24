# Brief do Projeto — Comunidade WhatsApp Alta Mogiana

## 1. Contexto e objetivo

Cliente é instrutor na Alta Mogiana e quer uma comunidade automatizada no WhatsApp
para engajar tratoristas e operadores: conteúdo relevante, reconhecimento da
equipe e enquetes. Prioridade: **máxima automação, mínimo custo**, com espaço
para o instrutor postar conteúdo humano e aprovar o que a IA gera.

Dois grupos separados:
- **Operadores** — recebem conteúdo/mensagem seg, qua, sex
- **Tratoristas** — recebem conteúdo/mensagem ter, qui, sex

## 2. Stack

| Camada | Tecnologia | Onde roda | Por quê |
|---|---|---|---|
| Dashboard | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui | Vercel (free) | UI rápida, free tier cobre esse porte |
| Worker WhatsApp | Node.js + TypeScript + Baileys | Fly.io ou Railway (VM always-on, ~US$5-10/mês) | Precisa de processo persistente 24h — serverless não segura conexão |
| Banco | Postgres via Supabase | Supabase (free tier) | Compartilhado entre dashboard e worker, já usado nos outros projetos |
| Auth | Supabase Auth | — | Login simples do instrutor |
| Geração de conteúdo | Google Gemini API (Flash / Flash-Lite) | Chamado pelo worker via cron | Free tier cobre o volume (6 gerações/semana); fallback pago é centavos |
| Comunicação dashboard ↔ worker | API REST interna protegida por secret compartilhado | — | Dashboard nunca fala direto com o WhatsApp — sempre via worker |

**Importante para o Claude Code:** não sugerir hospedar o worker na Vercel — funções
serverless não seguram sessão do Baileys viva. O worker é um serviço separado,
sempre ligado, com volume persistente para salvar a sessão de autenticação
(evita ter que escanear QR code a cada reinício).

## 3. Arquitetura (visão geral)

```
[Dashboard Next.js - Vercel]
        |
        | REST API (auth via secret)
        v
[Worker Node.js - Fly.io/Railway]
        |
        |-- Baileys (conexão WhatsApp, 2 sessões/grupos)
        |-- Fila de envio (polling na tabela send_queue)
        |-- Listener de eventos (replies, reações, votos de enquete)
        |-- Cron (seg/qua/sex e ter/qui/sex) -> chama Gemini -> gera conteúdo -> insere em send_queue com status "pending_approval"
        v
[Supabase Postgres] <-- lido/escrito pelos dois lados
```

## 4. Banco de dados — schema inicial

```sql
-- grupos (operador / tratorista)
groups (
  id, name, whatsapp_group_id, profile enum('operador','tratorista'), created_at
)

-- membros (para relatórios de engajamento e reconhecimento)
members (
  id, group_id, name, phone, birthday_date, active boolean, created_at
)

-- modelos de mensagem (blocos reutilizáveis pelo instrutor)
templates (
  id, name, type enum('texto','reconhecimento','enquete'), content jsonb, created_at
)

-- fila de envio (todo envio passa por aqui, manual ou gerado por IA)
send_queue (
  id, group_id, template_id nullable, content jsonb,
  source enum('manual','ai_generated'),
  status enum('pending_approval','approved','sent','failed'),
  scheduled_for, sent_at, error_message, created_at
)

-- eventos de engajamento capturados pelo worker
engagement_events (
  id, group_id, member_id nullable, send_queue_id,
  type enum('reply','reaction','poll_vote'),
  content, created_at
)

-- reconhecimentos (cadastro manual do instrutor)
recognitions (
  id, group_id, member_id, type enum('aniversario','destaque','marco_seguranca'),
  note, scheduled_for, sent boolean, created_at
)
```

## 5. Worker (WhatsApp) — responsabilidades

- Conectar 2 sessões Baileys (ou 1 sessão gerenciando 2 grupos, a definir na
  implementação — 1 sessão é mais simples e suficiente aqui, já que é o mesmo
  número admin nos dois grupos).
- Salvar auth state em volume persistente (não em memória).
- Reconectar automaticamente em queda de socket, sem exigir novo QR code.
- Processar `send_queue`: pegar itens com status `approved` e `scheduled_for <= now()`,
  enviar, marcar `sent` ou `failed` com retry exponencial (máx. 3 tentativas).
- Escutar eventos do grupo (mensagens, reações, respostas a enquete) e gravar em
  `engagement_events`, vinculando ao `send_queue_id` do post mais recente quando
  possível.
- Cron interno:
  - seg/qua/sex 08h: gera conteúdo para grupo `operador` via Gemini, insere em
    `send_queue` com status `pending_approval`
  - ter/qui/sex 08h: mesmo fluxo para grupo `tratorista`
- Expor endpoints internos (protegidos por secret, chamados só pelo dashboard):
  `POST /queue` (novo envio manual), `POST /queue/:id/approve`, `GET /health`.

## 6. Dashboard (Next.js) — responsabilidades

**Fase 1 — Base Operacional**
- Login (Supabase Auth, usuário único ou poucos usuários).
- CRUD de templates (blocos de texto/reconhecimento/enquete).
- Tela de novo envio: escolher grupo, template ou texto livre, agendar ou enviar
  agora → chama o worker.
- Tela de reconhecimentos: cadastro manual (aniversário, destaque, marco de
  segurança), com data de envio.
- Lista de membros por grupo (cadastro/edição).

**Fase 2 — Automação e Indicadores**
- Fila de aprovação: lista de conteúdo gerado por IA aguardando aprovação/edição
  antes de entrar na fila de envio real.
- Dashboard de KPIs por grupo e por período:
  - taxa de participação em enquete (votos únicos / membros)
  - taxa de resposta (replies únicos / membros, janela 24h pós-post)
  - taxa de reação
  - membros ativos vs. inativos (janela móvel 30 dias)
  - desempenho por tipo de conteúdo (segurança, manutenção, reconhecimento, enquete)

## 7. Requisitos não funcionais

- Custo mensal total deve ficar na faixa de US$8–16 (Gemini gratuito quando
  possível, fallback pago só se necessário).
- Nenhum envio deve ser "fire and forget" — sempre checar confirmação de entrega
  antes de marcar como `sent`.
- Todo conteúdo gerado por IA passa por aprovação humana antes de ir ao grupo
  (nunca publicar automaticamente sem revisão, nessa primeira versão).
- Não enviar dado sensível/interno da empresa para o Gemini no plano gratuito
  (usar apenas contexto genérico de agro/maquinário fornecido pelo cliente).

## 8. Ordem sugerida de implementação

1. Schema do banco no Supabase.
2. Worker: conexão Baileys + persistência de sessão + endpoint de saúde.
3. Worker: fila de envio com retry (testar sozinho, sem dashboard ainda).
4. Worker: listener de eventos de engajamento.
5. Dashboard: auth + CRUD de templates + tela de novo envio (chamando o worker).
6. Dashboard: reconhecimentos + lista de membros.
7. (Fase 2) Worker: cron + integração Gemini + fila de aprovação.
8. (Fase 2) Dashboard: tela de aprovação + KPIs.

---

**Instrução para o Claude Code:** comece pelo passo 1 (schema) e passo 2 (worker
básico com conexão Baileys e persistência de sessão). Antes de escrever código,
ler este arquivo inteiro. Ao final de cada etapa, validar contra os critérios da
seção 7 (requisitos não funcionais) antes de seguir para a próxima.
