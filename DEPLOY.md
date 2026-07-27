# Deploy — Conecta Campo

Guia único para colocar o sistema no ar. Divisão de contas decidida:

| Peça | Conta | Por quê |
|---|---|---|
| Supabase (banco + auth) | **sua conta secundária** (já é o projeto real usado em todo o dev) | fica com você |
| Gemini API key | **sua** (free tier, custo zero) | fica com você |
| Fly.io (worker WhatsApp) | **conta nova do cliente** | você cria, ele passa a administrar |
| Vercel (dashboard) | **conta nova do cliente** | você cria, ele passa a administrar |

Isso significa que Supabase e a chave do Gemini continuam sob sua
responsabilidade de fato (se sua conta secundária sumir, o banco do
cliente vai junto) — foi uma escolha consciente, não repito o alerta,
só deixando registrado aqui. Fly.io e Vercel é que ficam 100% fora da sua
mão a partir do deploy.

Ordem recomendada: confirmar Supabase (já existe) → Worker (Fly.io, conta
do cliente) → Dashboard (Vercel, conta do cliente).

---

## 0. Pré-requisitos

- Criar para o cliente: conta **Fly.io** e conta **Vercel**.
- Repositório do projeto num GitHub (do cliente ou seu — quem for conectar
  o Vercel/Fly precisa ter acesso de leitura a ele).
- `flyctl` instalado localmente para rodar o primeiro deploy do worker
  (`curl -L https://fly.io/install.sh | sh`), logado na conta do cliente.

---

## 1. Supabase — só conferir, projeto já existe

O projeto Supabase já é o mesmo usado durante todo o desenvolvimento (na
sua conta secundária) — não precisa criar nada novo. Só falta confirmar
que as migrations mais recentes, ainda não commitadas, foram aplicadas
manualmente (fluxo normal deste projeto: [[feedback-supabase-manual]] —
nunca aplicar via MCP, sempre SQL manual no editor do Supabase):

- [ ] `supabase/migrations/20260724020000_topics_search.sql`
- [ ] `supabase/migrations/20260726000000_members_phone_unique.sql`

Se ainda não rodou essas duas no projeto real, rode agora pelo **SQL
Editor** do Supabase antes de seguir — sem elas a busca de temas e a
constraint de telefone único em `members` não existem em produção.

- **Não rode** `supabase/seed_demo_data.sql` no projeto real — é só dado
  fictício de demonstração. Se ele já foi aplicado nesse projeto por
  engano, rode `supabase/seed_demo_data_rollback.sql` antes de ir ao ar.
- Confirme que o usuário de login do instrutor já existe em
  **Authentication → Users**; se não, crie um (email + senha) — não existe
  cadastro público, o login é restrito a usuários criados manualmente ali.
- Tenha à mão (você já tem, em `supabase/.env.local` e `worker/.env`):
  `Project URL`, `anon public key` e `service_role key` — vão para o Fly
  e o Vercel nos passos seguintes.

## 2. Chave do Gemini

Você já tem a API key (free tier) usada em dev — mesma chave vai direto
para os secrets do Fly no passo 3. NewsAPI (opcional) também, se já
tiver uma.

## 3. Worker — Fly.io (conta nova do cliente)

O worker **não pode** ir para Vercel/serverless — o Baileys precisa manter
uma conexão WebSocket viva e uma sessão persistida em disco. Por isso vai
para o Fly.io, que já está configurado em `worker/Dockerfile` e
`worker/fly.toml`.

```bash
cd worker
fly auth login                 # login na conta do cliente
fly launch --no-deploy         # detecta o Dockerfile; escolha um nome de app
                                # (ajuste "app" em fly.toml se mudar o nome)
                                # responda "não" para Postgres/Redis — não usamos
fly volumes create conectacampo_auth_state --size 1 --region gru
```

Configurar os secrets (nunca commitados — ficam só no Fly):

```bash
fly secrets set \
  SUPABASE_URL="https://SEU-PROJETO.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  WORKER_SECRET="$(openssl rand -hex 32)" \
  GEMINI_API_KEY="..." \
  NEWS_API_KEY="..."
```

Guarde o `WORKER_SECRET` gerado — ele também vai para o Vercel no passo 4.

```bash
fly deploy
```

Depois do deploy, confira:

```bash
fly status                     # máquina rodando, health check OK em /health
```

**Importante:** em `fly.toml`, `auto_stop_machines = false` e
`min_machines_running = 1` já estão setados de propósito — se o Fly
suspender a máquina por inatividade, a sessão do WhatsApp cai e precisaria
escanear o QR de novo. Não mude isso para "auto stop" para economizar
custo.

## 4. Dashboard — Vercel

1. Importar o repositório em https://vercel.com/new (conta do cliente).
2. Em **Root Directory**, apontar para `dashboard` (é um monorepo simples,
   o Vercel não detecta isso sozinho).
3. Framework preset: Next.js (detecção automática deve funcionar).
4. Variáveis de ambiente (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `WORKER_URL` → `https://<nome-do-app>.fly.dev` (sem barra no final)
   - `WORKER_SECRET` → o mesmo valor gerado no passo 3
5. Deploy.

## 5. Conectar o WhatsApp

1. Abrir o dashboard publicado, ir em **Configurações**.
2. O card de conexão do WhatsApp deve mostrar um QR code (via
   `GET /whatsapp/status` no worker).
3. Escanear com o WhatsApp que vai administrar os grupos.
4. A sessão fica salva no volume persistente do Fly — sobrevive a
   redeploys e reinícios da máquina. Só precisa escanear de novo se alguém
   deslogar manualmente (`/whatsapp/logout`) ou trocar de volume.

## 6. Checklist final

- [ ] Login funciona no dashboard publicado (usuário criado no passo 1.4)
- [ ] `fly status` mostra a máquina do worker rodando
- [ ] `/health` do worker responde 200 (`curl https://<app>.fly.dev/health`)
- [ ] QR code escaneado e WhatsApp conectado
- [ ] Grupos de operadores/tratoristas cadastrados no dashboard
- [ ] Um envio de teste (manual) chega no grupo
- [ ] Billing de Fly.io e Vercel confirmado como sendo da conta do cliente
- [ ] Anotado em algum lugar seu (fora deste repo) que o Supabase e a
      chave Gemini deste projeto vivem na sua conta secundária, caso
      precise repassar credenciais um dia

A partir daqui, o worker e o dashboard em si não dependem de você ficar de
plantão — Fly.io e Vercel são do cliente, upgrades/monitoramento/billing
dessas duas peças são responsabilidade dele. Supabase e a chave Gemini
continuam na sua conta por escolha (free tier, sem custo/atrito), então
tecnicamente você segue sendo o titular dessas duas peças — só não precisa
operá-las no dia a dia.
