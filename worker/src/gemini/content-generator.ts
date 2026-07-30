import { logger } from "../logger.js";
import { supabase } from "../supabase.js";
import { generateText } from "./client.js";
import { findRelevantDocument, type RelevantDocument } from "./document-context.js";
import { EQUIPMENT_CONTEXT } from "./equipment-context.js";
import { fetchAgroNews, type NewsArticle } from "./news.js";
import { markTopicUsed, selectTopic, type Topic } from "./topics.js";

export type GroupProfile = "operador" | "tratorista";

const DAY_MS = 24 * 60 * 60 * 1000;
const FEW_SHOT_LIMIT = 3;

// Chance de cada mensagem do lote semanal automático buscar novidades reais
// (ver news.ts) mesmo sem um tema marcado como "busca" — deixa o lote mais
// dinâmico em vez de repetir sempre os mesmos temas cadastrados. Só se aplica
// à geração semanal (ver `generateWeek`); geração avulsa/manual continua
// determinística, só busca quando o tema selecionado está marcado pra isso.
const WEEKLY_SEARCH_MIX_PROBABILITY = 0.4;

// Teto diário de chamadas ao Gemini (soma o lote semanal automático + gerações
// avulsas pelo Calendário), pra não estourar a cota do free tier.
export const DAILY_GENERATION_LIMIT = 20;

// seg=1, ter=2, qua=3, qui=4, sex=5 — dias de envio de cada grupo, ver
// PROJECT_BRIEF.md seção 5.
const SEND_DAYS: Record<GroupProfile, number[]> = {
  operador: [1, 3, 5],
  tratorista: [2, 4, 5],
};

const PROFILE_LABEL: Record<GroupProfile, string> = {
  operador: "operadores de máquinas agrícolas",
  tratorista: "tratoristas",
};

interface GroupRow {
  id: string;
  name: string;
}

function buildPrompt(
  profile: GroupProfile,
  topic: Topic | null,
  examples: string[],
  newsArticles: NewsArticle[],
  hasDocument: boolean,
): string {
  const audience = PROFILE_LABEL[profile];
  const topicInstruction =
    newsArticles.length > 0
      ? `Escolha UMA das novidades reais abaixo (a mais relevante pro dia a dia de ${audience}) e escreva a mensagem sobre ela, mencionando o fato com naturalidade — sem inventar números ou detalhes que não vieram da notícia:\n${newsArticles
          .map((a) => `- "${a.title}"${a.description ? ` — ${a.description}` : ""} (fonte: ${a.source})`)
          .join("\n")}`
      : topic
        ? `Tema desta mensagem: "${topic.title}".${topic.description ? ` Detalhes: ${topic.description}` : ""}`
        : "Escolha livremente um tema relevante de segurança, manutenção ou boas práticas para o dia a dia da equipe.";

  const documentInstruction = hasDocument
    ? "\nUm manual técnico real do equipamento desta mensagem foi anexado a esta conversa — use informações reais de lá (procedimentos, especificações, avisos) quando fizer sentido pro tema, sem inventar dados que não estejam no documento.\n"
    : "";

  const examplesBlock =
    examples.length > 0
      ? `
Exemplos de mensagens que já agradaram o instrutor antes (use como referência de TOM, ESTRUTURA e ESTILO — não repita o conteúdo/tema delas):
${examples.map((text, i) => `--- exemplo ${i + 1} ---\n${text}`).join("\n\n")}
`
      : "";

  return `
Você escreve mensagens curtas para um grupo de WhatsApp de uma operação agrícola,
voltadas a ${audience}.

${EQUIPMENT_CONTEXT}

${topicInstruction}
${documentInstruction}
${examplesBlock}
Formato da mensagem (siga essa estrutura, com quebras de linha reais entre as partes):
1. Uma linha de abertura curta e chamativa, com *negrito* (um asterisco de cada lado) e 1 emoji relevante ao tema (⚠️ segurança, 🔧 manutenção, 🌱 boas práticas, 🚜 operação) — nunca use # ou outro markdown.
2. Uma linha em branco.
3. O corpo: 2 a 4 linhas curtas com a informação/dica em si, direto ao ponto, mencionando o equipamento quando fizer sentido. Pode usar "•" pra listar 2-3 pontos rápidos, se ajudar a leitura.
4. Uma linha em branco.
5. Um fechamento curto que convide a reagir ou responder (ex: pedir pra responder com 👍/🙌, fazer uma pergunta rápida sobre a rotina do time, ou pedir pra confirmar que já fez a checagem) — isso é importante pra gerar engajamento real no grupo.

Regras:
- Português do Brasil, tom direto, próximo e respeitoso — como um colega experiente avisando algo importante, não como um comunicado formal de empresa.
- Emojis com moderação: 2 a 4 no total espalhados pela mensagem (abertura, algum ponto do corpo, fechamento). Nunca emoji atrás de emoji, nunca mais de 1 por linha.
- Sem saudação genérica tipo "Bom dia equipe" — a linha de abertura já entra no assunto.
- Não invente números, prazos ou políticas internas da empresa.
- Responda só com o texto final da mensagem, sem comentários extras, sem aspas envolvendo o texto todo.
`.trim();
}

async function fetchGroups(profile: GroupProfile): Promise<GroupRow[]> {
  const { data, error } = await supabase.from("groups").select("id, name").eq("profile", profile);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchGroupById(groupId: string): Promise<{ id: string; name: string; profile: GroupProfile } | null> {
  const { data, error } = await supabase.from("groups").select("id, name, profile").eq("id", groupId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// Quantas mensagens por IA já foram geradas hoje (lote semanal + avulsas) —
// usado pra aplicar o teto diário `DAILY_GENERATION_LIMIT`.
export async function countTodayGenerations(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("send_queue")
    .select("id", { count: "exact", head: true })
    .eq("source", "ai_generated")
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    logger.error({ error }, "Falha ao contar gerações do dia — assumindo 0.");
    return 0;
  }

  return count ?? 0;
}

interface FewShotRow {
  content: { text?: string } | null;
}

// Busca as últimas mensagens desse perfil que o instrutor aprovou (com ou
// sem edição) — usadas como exemplo few-shot. Modo "robusto" (busca
// semântica) ainda não está implementado: por enquanto qualquer modo se
// comporta como "simples".
async function fetchFewShotExamples(profile: GroupProfile, groupIds: string[]): Promise<string[]> {
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("send_queue")
    .select("content")
    .in("group_id", groupIds)
    .eq("source", "ai_generated")
    .in("ai_feedback", ["positive", "medium"])
    .order("created_at", { ascending: false })
    .limit(FEW_SHOT_LIMIT);

  if (error) {
    logger.error({ error, profile }, "Falha ao buscar exemplos few-shot — seguindo sem exemplos.");
    return [];
  }

  return ((data ?? []) as FewShotRow[]).map((row) => row.content?.text).filter((text): text is string => Boolean(text));
}

// Temas de busca (`isSearch`) são sobre novidades atuais, não sobre um
// equipamento específico — não faz sentido tentar casar um manual técnico
// nesse caso.
async function resolveDocument(topic: Topic | null): Promise<RelevantDocument | null> {
  if (!topic || topic.isSearch) return null;
  return findRelevantDocument(`${topic.title} ${topic.description ?? ""}`);
}

// Gera UMA mensagem e enfileira uma cópia dela pra cada grupo do `profile`,
// agendada para `scheduledFor`. Seleciona e já marca o tema como usado antes
// de retornar — chamadas sequenciais (ver `generateWeek`) naturalmente giram
// entre temas diferentes em vez de repetir o mesmo tema várias vezes.
async function generateOne(
  profile: GroupProfile,
  scheduledFor: Date,
  options?: { allowRandomSearch?: boolean },
): Promise<void> {
  const groups = await fetchGroups(profile);

  if (groups.length === 0) {
    logger.warn({ profile }, "Nenhum grupo cadastrado para este perfil, geração de conteúdo pulada.");
    return;
  }

  const topic = await selectTopic();
  const examples = await fetchFewShotExamples(
    profile,
    groups.map((g) => g.id),
  );
  const wantsNews =
    topic?.isSearch === true ||
    (options?.allowRandomSearch === true && Math.random() < WEEKLY_SEARCH_MIX_PROBABILITY);
  const newsArticles = wantsNews ? await fetchAgroNews(topic?.title) : [];
  const document = await resolveDocument(topic);
  const prompt = buildPrompt(profile, topic, examples, newsArticles, document !== null);

  try {
    const text = await generateText(prompt, document ?? undefined);
    const content = { type: "text" as const, text };

    for (const group of groups) {
      const { error } = await supabase.from("send_queue").insert({
        group_id: group.id,
        content,
        original_content: content,
        source: "ai_generated",
        status: "pending_approval",
        scheduled_for: scheduledFor.toISOString(),
      });

      if (error) {
        logger.error({ error, groupId: group.id, profile }, "Falha ao inserir conteúdo gerado na fila.");
        continue;
      }

      logger.info(
        {
          groupId: group.id,
          profile,
          topicId: topic?.id,
          usedNews: newsArticles.length > 0,
          scheduledFor,
          fewShotCount: examples.length,
        },
        "Conteúdo gerado por IA inserido na fila.",
      );
    }
  } catch (err) {
    logger.error({ err, profile }, "Falha ao gerar conteúdo por IA.");
  }

  if (topic) {
    await markTopicUsed(topic.id);
  }
}

// Teste manual imediato (scheduled_for = agora) — usado pelo script
// `pnpm generate-content <operador|tratorista>`.
export async function generateForProfile(profile: GroupProfile): Promise<void> {
  await generateOne(profile, new Date());
}

function nextDateForWeekday(from: Date, weekday: number): Date {
  const diffDays = (weekday - from.getDay() + 7) % 7;
  return new Date(from.getTime() + diffDays * DAY_MS);
}

// Gera a semana inteira de uma vez (chamado pelo cron de domingo): uma
// mensagem por dia de envio de cada grupo, já agendada pro dia/hora real
// (a hora do próprio disparo do cron, ex: 8h) — assim o instrutor aprova
// tudo numa sentada só e cada mensagem só sai no seu dia certo.
export async function generateWeek(): Promise<void> {
  const now = new Date();
  const targets: Array<{ profile: GroupProfile; scheduledFor: Date }> = [];

  for (const profile of Object.keys(SEND_DAYS) as GroupProfile[]) {
    for (const weekday of SEND_DAYS[profile]) {
      targets.push({ profile, scheduledFor: nextDateForWeekday(now, weekday) });
    }
  }

  targets.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

  for (const target of targets) {
    await generateOne(target.profile, target.scheduledFor, { allowRandomSearch: true });
  }

  logger.info({ count: targets.length }, "Geração semanal de conteúdo concluída.");
}

export interface AdHocGeneration {
  id: string;
  text: string;
  scheduledFor: string;
}

// Geração avulsa disparada manualmente pelo instrutor (ex: clicando num dia
// vazio no Calendário). Não faz parte do lote semanal automático, mas
// consome o mesmo orçamento diário de chamadas ao Gemini — o chamador (ver
// server.ts) deve checar `countTodayGenerations()` contra
// `DAILY_GENERATION_LIMIT` antes de chamar isso.
export async function generateAdHoc(groupId: string, scheduledFor: Date): Promise<AdHocGeneration> {
  const group = await fetchGroupById(groupId);
  if (!group) {
    throw new Error("Grupo não encontrado.");
  }

  const topic = await selectTopic();
  const examples = await fetchFewShotExamples(group.profile, [group.id]);
  const newsArticles = topic?.isSearch === true ? await fetchAgroNews(topic.title) : [];
  const document = await resolveDocument(topic);
  const prompt = buildPrompt(group.profile, topic, examples, newsArticles, document !== null);

  const text = await generateText(prompt, document ?? undefined);
  const content = { type: "text" as const, text };

  const { data, error } = await supabase
    .from("send_queue")
    .insert({
      group_id: group.id,
      content,
      original_content: content,
      source: "ai_generated",
      status: "pending_approval",
      scheduled_for: scheduledFor.toISOString(),
    })
    .select("id, scheduled_for")
    .single();

  if (error) {
    throw error;
  }

  if (topic) {
    await markTopicUsed(topic.id);
  }

  logger.info(
    {
      groupId: group.id,
      profile: group.profile,
      topicId: topic?.id,
      usedNews: newsArticles.length > 0,
      scheduledFor,
    },
    "Geração avulsa inserida na fila.",
  );

  return { id: data.id, text, scheduledFor: data.scheduled_for };
}
