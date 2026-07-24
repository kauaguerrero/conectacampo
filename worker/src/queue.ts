import type { WASocket } from "@whiskeysockets/baileys";
import { config } from "./config.js";
import { isPollContent, isTextContent } from "./content.js";
import { logger } from "./logger.js";
import { sendPollAndPersist } from "./polls.js";
import { supabase } from "./supabase.js";
import { connectionState, getSocket } from "./whatsapp.js";

interface SendQueueRow {
  id: string;
  content: unknown;
  attempts: number;
  groups: { whatsapp_group_id: string } | null;
}

function backoffMs(attempts: number): number {
  return config.queueRetryBaseMs * 2 ** (attempts - 1);
}

async function fetchDueItems(): Promise<SendQueueRow[]> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("send_queue")
    .select("id, content, attempts, groups(whatsapp_group_id)")
    .eq("status", "approved")
    .lte("scheduled_for", nowIso)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
    .order("scheduled_for", { ascending: true })
    .limit(config.queueBatchSize);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as SendQueueRow[];
}

async function markSent(id: string): Promise<void> {
  const { error } = await supabase
    .from("send_queue")
    .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
    .eq("id", id);

  if (error) {
    logger.error({ error, id }, "Falha ao marcar item da fila como enviado.");
  }
}

async function handleFailure(id: string, currentAttempts: number, errorMessage: string): Promise<void> {
  const attempts = currentAttempts + 1;
  const exhausted = attempts >= config.queueMaxAttempts;

  const update = exhausted
    ? { status: "failed" as const, attempts, error_message: errorMessage, next_attempt_at: null }
    : {
        attempts,
        error_message: errorMessage,
        next_attempt_at: new Date(Date.now() + backoffMs(attempts)).toISOString(),
      };

  const { error } = await supabase.from("send_queue").update(update).eq("id", id);
  if (error) {
    logger.error({ error, id }, "Falha ao atualizar item da fila após erro de envio.");
  }

  logger.warn({ id, attempts, exhausted, errorMessage }, "Falha ao enviar mensagem da fila.");
}

async function sendContent(sock: WASocket, jid: string, sendQueueId: string, content: unknown) {
  if (isTextContent(content)) {
    return sock.sendMessage(jid, { text: content.text });
  }

  if (isPollContent(content)) {
    return sendPollAndPersist(sock, jid, sendQueueId, content);
  }

  throw new Error(
    'Formato de conteúdo não suportado (esperado {"type":"text","text":"..."} ou {"type":"poll","question":"...","options":[...]}).',
  );
}

async function processItem(item: SendQueueRow, sock: WASocket): Promise<void> {
  const jid = item.groups?.whatsapp_group_id;

  if (!jid) {
    await handleFailure(item.id, item.attempts, "Grupo sem whatsapp_group_id configurado.");
    return;
  }

  try {
    const result = await sendContent(sock, jid, item.id, item.content);

    // Confirmação mínima de entrega ao servidor do WhatsApp: o envio só é
    // considerado bem-sucedido se a API retornar uma message key válida.
    // Confirmação de entrega ao destinatário (recibo) é responsabilidade do
    // listener de eventos (engagement_events), não deste processador.
    if (!result?.key?.id) {
      throw new Error("WhatsApp não confirmou o envio (sem message key).");
    }

    await markSent(item.id);
    logger.info({ sendQueueId: item.id }, "Mensagem da fila enviada.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await handleFailure(item.id, item.attempts, message);
  }
}

let ticking = false;

async function tick(): Promise<void> {
  if (ticking || connectionState.status !== "open") {
    return;
  }

  const sock = getSocket();
  if (!sock) {
    return;
  }

  ticking = true;
  try {
    const items = await fetchDueItems();
    for (const item of items) {
      await processItem(item, sock);
    }
  } catch (err) {
    logger.error({ err }, "Erro ao consultar a fila de envio.");
  } finally {
    ticking = false;
  }
}

export function startQueueProcessor(): void {
  setInterval(() => {
    void tick();
  }, config.queuePollIntervalMs);
  logger.info(
    { intervalMs: config.queuePollIntervalMs },
    "Processador da fila de envio iniciado.",
  );
}
