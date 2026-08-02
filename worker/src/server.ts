import crypto from "node:crypto";
import http from "node:http";
import { isSendableContent } from "./content.js";
import { config } from "./config.js";
import { countTodayGenerations, generateAdHoc, DAILY_GENERATION_LIMIT } from "./gemini/content-generator.js";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { ConnectCooldownError, connectionState, getSocket, logoutAndClearSession, reconnectWhatsApp } from "./whatsapp.js";

function isAuthorized(req: http.IncomingMessage): boolean {
  const header = req.headers.authorization ?? "";
  const expected = `Bearer ${config.workerSecret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);

  if (headerBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(headerBuf, expectedBuf);
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk: Buffer) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Corpo da requisição muito grande."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON inválido."));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

interface CreateQueueBody {
  group_id?: unknown;
  content?: unknown;
  template_id?: unknown;
  scheduled_for?: unknown;
}

async function handleCreateQueueItem(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body: CreateQueueBody;
  try {
    body = ((await readJsonBody(req)) ?? {}) as CreateQueueBody;
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "JSON inválido." });
    return;
  }

  if (typeof body.group_id !== "string" || body.group_id.length === 0) {
    sendJson(res, 400, { error: "group_id é obrigatório." });
    return;
  }

  if (!isSendableContent(body.content)) {
    sendJson(res, 400, {
      error: 'content inválido (esperado {"type":"text","text":"..."} ou {"type":"poll","question":"...","options":[...]}).',
    });
    return;
  }

  if (body.template_id !== undefined && typeof body.template_id !== "string") {
    sendJson(res, 400, { error: "template_id deve ser string quando informado." });
    return;
  }

  if (body.scheduled_for !== undefined && Number.isNaN(Date.parse(String(body.scheduled_for)))) {
    sendJson(res, 400, { error: "scheduled_for deve ser uma data válida (ISO 8601)." });
    return;
  }

  const { data, error } = await supabase
    .from("send_queue")
    .insert({
      group_id: body.group_id,
      template_id: body.template_id ?? null,
      content: body.content,
      source: "manual",
      status: "approved",
      scheduled_for: body.scheduled_for ? new Date(String(body.scheduled_for)).toISOString() : new Date().toISOString(),
      attempts: 0,
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, "Falha ao criar item na fila de envio via API.");
    // 23503 = violação de foreign key (ex: group_id inexistente)
    const status = error.code === "23503" ? 400 : 500;
    sendJson(res, status, { error: error.message });
    return;
  }

  sendJson(res, 201, data);
}

interface ApproveQueueBody {
  content?: unknown;
  scheduled_for?: unknown;
}

async function handleApproveQueueItem(id: string, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body: ApproveQueueBody;
  try {
    body = ((await readJsonBody(req)) ?? {}) as ApproveQueueBody;
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "JSON inválido." });
    return;
  }

  if (body.content !== undefined && !isSendableContent(body.content)) {
    sendJson(res, 400, {
      error: 'content inválido (esperado {"type":"text","text":"..."} ou {"type":"poll","question":"...","options":[...]}).',
    });
    return;
  }

  if (body.scheduled_for !== undefined && Number.isNaN(Date.parse(String(body.scheduled_for)))) {
    sendJson(res, 400, { error: "scheduled_for deve ser uma data válida (ISO 8601)." });
    return;
  }

  const { data: current, error: fetchError } = await supabase
    .from("send_queue")
    .select("id, status, source, content, original_content")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    logger.error({ error: fetchError, id }, "Falha ao buscar item da fila para aprovação.");
    sendJson(res, 500, { error: fetchError.message });
    return;
  }

  if (!current) {
    sendJson(res, 404, { error: "Item não encontrado." });
    return;
  }

  if (current.status !== "pending_approval") {
    sendJson(res, 409, { error: `Item está com status "${current.status}", não pode ser aprovado.` });
    return;
  }

  const update: Record<string, unknown> = { status: "approved" };
  if (body.content !== undefined) {
    update.content = body.content;
  }
  if (body.scheduled_for !== undefined) {
    update.scheduled_for = new Date(String(body.scheduled_for)).toISOString();
  }

  // Flywheel de feedback: aprovado sem editar = "positive", editado antes de
  // aprovar = "medium" — vira exemplo few-shot na próxima geração.
  if (current.source === "ai_generated" && current.original_content) {
    const finalContent = (body.content ?? current.content) as { type?: string; text?: string } | null;
    const original = current.original_content as { type?: string; text?: string };
    const unchanged =
      finalContent?.type === "text" && original.type === "text" && finalContent.text === original.text;
    update.ai_feedback = unchanged ? "positive" : "medium";
  }

  const { data, error } = await supabase.from("send_queue").update(update).eq("id", id).select().single();

  if (error) {
    logger.error({ error, id }, "Falha ao aprovar item da fila.");
    sendJson(res, 500, { error: error.message });
    return;
  }

  sendJson(res, 200, data);
}

function handleWhatsAppStatus(_req: http.IncomingMessage, res: http.ServerResponse): void {
  sendJson(res, 200, {
    status: connectionState.status,
    lastError: connectionState.lastError ?? null,
    qrImage: connectionState.qrImage,
    hadQr: connectionState.hadQr,
    user: connectionState.user,
  });
}

async function handleWhatsAppLogout(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  await logoutAndClearSession();
  sendJson(res, 200, { status: connectionState.status });
}

async function handleWhatsAppConnect(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  try {
    await reconnectWhatsApp();
  } catch (err) {
    if (err instanceof ConnectCooldownError) {
      sendJson(res, 429, { error: err.message });
      return;
    }
    throw err;
  }
  sendJson(res, 200, { status: connectionState.status });
}

async function handleWhatsAppGroups(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const sock = getSocket();

  if (!sock || connectionState.status !== "open") {
    sendJson(res, 409, { error: "WhatsApp não está conectado." });
    return;
  }

  try {
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups)
      .map((g) => ({ id: g.id, name: g.subject, participants: g.participants.length }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    sendJson(res, 200, { groups: list });
  } catch (err) {
    logger.error({ err }, "Falha ao listar grupos do WhatsApp.");
    sendJson(res, 500, { error: "Falha ao listar grupos do WhatsApp." });
  }
}

interface GroupsParticipantsBody {
  ids?: unknown;
}

async function handleGroupsParticipants(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const sock = getSocket();

  if (!sock || connectionState.status !== "open") {
    sendJson(res, 409, { error: "WhatsApp não está conectado." });
    return;
  }

  let body: GroupsParticipantsBody;
  try {
    body = ((await readJsonBody(req)) ?? {}) as GroupsParticipantsBody;
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "JSON inválido." });
    return;
  }

  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
    sendJson(res, 400, { error: "ids deve ser uma lista de IDs de grupo." });
    return;
  }

  try {
    const groups = await sock.groupFetchAllParticipating();
    const participants: Record<string, string[]> = {};
    for (const id of body.ids as string[]) {
      const group = groups[id];
      // Prefere phoneNumber ao id: em grupos migrados pro sistema LID, o id
      // vem como identificador opaco @lid em vez do JID de telefone.
      participants[id] = group
        ? group.participants.map((p) => (p.phoneNumber ?? p.id).split("@")[0].split(":")[0])
        : [];
    }
    sendJson(res, 200, { participants });
  } catch (err) {
    logger.error({ err }, "Falha ao listar participantes dos grupos.");
    sendJson(res, 500, { error: "Falha ao listar participantes dos grupos." });
  }
}

async function handleGenerationLimit(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const count = await countTodayGenerations();
  sendJson(res, 200, { count, limit: DAILY_GENERATION_LIMIT });
}

interface GenerateBody {
  group_id?: unknown;
  scheduled_for?: unknown;
}

async function handleGenerate(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (!config.geminiApiKey) {
    sendJson(res, 503, { error: "Geração por IA desativada (GEMINI_API_KEY não configurada)." });
    return;
  }

  let body: GenerateBody;
  try {
    body = ((await readJsonBody(req)) ?? {}) as GenerateBody;
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "JSON inválido." });
    return;
  }

  if (typeof body.group_id !== "string" || body.group_id.length === 0) {
    sendJson(res, 400, { error: "group_id é obrigatório." });
    return;
  }

  if (typeof body.scheduled_for !== "string" || Number.isNaN(Date.parse(body.scheduled_for))) {
    sendJson(res, 400, { error: "scheduled_for deve ser uma data válida (ISO 8601)." });
    return;
  }

  const count = await countTodayGenerations();
  if (count >= DAILY_GENERATION_LIMIT) {
    sendJson(res, 429, {
      error: `Limite diário de gerações por IA atingido (${DAILY_GENERATION_LIMIT}). Aguarde até amanhã.`,
      count,
      limit: DAILY_GENERATION_LIMIT,
    });
    return;
  }

  try {
    const result = await generateAdHoc(body.group_id, new Date(body.scheduled_for));
    sendJson(res, 201, { ...result, count: count + 1, limit: DAILY_GENERATION_LIMIT });
  } catch (err) {
    logger.error({ err }, "Falha ao gerar mensagem avulsa.");
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Falha ao gerar mensagem." });
  }
}

export function startServer(): void {
  const server = http.createServer((req, res) => {
    void (async () => {
      if (req.method === "GET" && req.url === "/health") {
        // Só atesta que o processo/servidor HTTP está de pé — não depende do
        // WhatsApp estar conectado, senão o Fly derruba o roteamento pra
        // máquina inteira (fila, geração de IA, etc.) toda vez que a sessão
        // do WhatsApp cai ou está reconectando.
        sendJson(res, 200, {
          status: connectionState.status,
          lastError: connectionState.lastError ?? null,
        });
        return;
      }

      // Todas as rotas abaixo são internas: só o dashboard deve chamá-las,
      // autenticado com o secret compartilhado.
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: "Não autorizado." });
        return;
      }

      const approveMatch = req.url?.match(/^\/queue\/([^/]+)\/approve$/);

      if (req.method === "POST" && req.url === "/queue") {
        await handleCreateQueueItem(req, res);
        return;
      }

      if (req.method === "POST" && approveMatch) {
        await handleApproveQueueItem(approveMatch[1], req, res);
        return;
      }

      if (req.method === "GET" && req.url === "/whatsapp/status") {
        handleWhatsAppStatus(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/whatsapp/logout") {
        await handleWhatsAppLogout(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/whatsapp/connect") {
        await handleWhatsAppConnect(req, res);
        return;
      }

      if (req.method === "GET" && req.url === "/whatsapp/groups") {
        await handleWhatsAppGroups(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/whatsapp/groups/participants") {
        await handleGroupsParticipants(req, res);
        return;
      }

      if (req.method === "GET" && req.url === "/generate/limit") {
        await handleGenerationLimit(req, res);
        return;
      }

      if (req.method === "POST" && req.url === "/generate") {
        await handleGenerate(req, res);
        return;
      }

      sendJson(res, 404, { error: "not_found" });
    })().catch((err) => {
      logger.error({ err }, "Erro não tratado no servidor HTTP.");
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Erro interno." });
      }
    });
  });

  server.listen(config.port, () => {
    logger.info(`Servidor HTTP ouvindo na porta ${config.port}.`);
  });
}
