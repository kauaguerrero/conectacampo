import { jidNormalizedUser } from "@whiskeysockets/baileys";
import type { WAMessage, WASocket } from "@whiskeysockets/baileys";
import { logger } from "./logger.js";
import { decodePollVote } from "./polls.js";
import { supabase } from "./supabase.js";

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function jidToDigits(jid: string): string {
  return normalizeDigits(jid.split("@")[0].split(":")[0]);
}

async function findGroupId(whatsappGroupId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("id")
    .eq("whatsapp_group_id", whatsappGroupId)
    .maybeSingle();

  if (error) {
    logger.error({ error, whatsappGroupId }, "Falha ao buscar grupo para evento de engajamento.");
    return null;
  }

  return data?.id ?? null;
}

async function findMemberId(groupId: string, senderJid: string): Promise<string | null> {
  const digits = jidToDigits(senderJid);
  if (!digits) {
    return null;
  }

  const { data, error } = await supabase.from("members").select("id, phone").eq("group_id", groupId);

  if (error || !data) {
    if (error) {
      logger.error({ error, groupId }, "Falha ao buscar membros para evento de engajamento.");
    }
    return null;
  }

  const match = data.find((member) => {
    const memberDigits = normalizeDigits(member.phone);
    return memberDigits.length > 0 && (memberDigits === digits || digits.endsWith(memberDigits) || memberDigits.endsWith(digits));
  });

  return match?.id ?? null;
}

async function findLatestSendQueueId(groupId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("send_queue")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ error, groupId }, "Falha ao buscar último envio para vincular evento de engajamento.");
    return null;
  }

  return data?.id ?? null;
}

async function recordEvent(params: {
  whatsappGroupId: string;
  senderJid: string;
  type: "reply" | "reaction";
  content: string;
}): Promise<void> {
  const { whatsappGroupId, senderJid, type, content } = params;

  const groupId = await findGroupId(whatsappGroupId);
  if (!groupId) {
    // Grupo não cadastrado no dashboard (ex: outro grupo qualquer do número
    // admin) — não é um evento relevante pra gente, ignora.
    return;
  }

  const [memberId, sendQueueId] = await Promise.all([
    findMemberId(groupId, senderJid),
    findLatestSendQueueId(groupId),
  ]);

  const { error } = await supabase.from("engagement_events").insert({
    group_id: groupId,
    member_id: memberId,
    send_queue_id: sendQueueId,
    type,
    content,
  });

  if (error) {
    logger.error({ error, groupId, type }, "Falha ao gravar evento de engajamento.");
    return;
  }

  logger.info({ groupId, type, memberId, sendQueueId }, "Evento de engajamento registrado.");
}

async function recordPollVote(params: {
  whatsappGroupId: string;
  senderJid: string;
  sendQueueId: string;
  selectedOptions: string[];
}): Promise<void> {
  const { whatsappGroupId, senderJid, sendQueueId, selectedOptions } = params;

  const groupId = await findGroupId(whatsappGroupId);
  if (!groupId) {
    return;
  }

  const memberId = await findMemberId(groupId, senderJid);

  const { error } = await supabase.from("engagement_events").insert({
    group_id: groupId,
    member_id: memberId,
    send_queue_id: sendQueueId,
    type: "poll_vote",
    content: selectedOptions.join(", "),
  });

  if (error) {
    logger.error({ error, groupId }, "Falha ao gravar voto de enquete.");
    return;
  }

  logger.info({ groupId, memberId, sendQueueId, selectedOptions }, "Voto de enquete registrado.");
}

function extractMessageText(message: WAMessage["message"]): string | null {
  if (!message) {
    return null;
  }

  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    null
  );
}

export function registerEngagementListeners(sock: WASocket): void {
  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") {
      return;
    }

    // Ver comentário equivalente em polls.ts — usa o LID, não o JID de
    // número de telefone, pra bater com o que o WhatsApp assina nos votos.
    const meId = jidNormalizedUser(sock.user?.lid ?? sock.user?.id ?? "");

    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      const senderJid = msg.key.participant ?? msg.key.remoteJid;

      if (!jid?.endsWith("@g.us") || msg.key.fromMe || !senderJid) {
        continue;
      }

      const pollUpdate = msg.message?.pollUpdateMessage;
      if (pollUpdate) {
        void (async () => {
          const vote = await decodePollVote(meId, pollUpdate, msg.key);
          if (vote && vote.selectedOptions.length > 0) {
            await recordPollVote({
              whatsappGroupId: jid,
              senderJid,
              sendQueueId: vote.sendQueueId,
              selectedOptions: vote.selectedOptions,
            });
          }
        })();
        continue;
      }

      const text = extractMessageText(msg.message);
      if (text === null) {
        // Mensagem sem texto extraível (mídia sem legenda, sticker, etc.) —
        // fora do escopo desta primeira versão do listener.
        continue;
      }

      void recordEvent({ whatsappGroupId: jid, senderJid, type: "reply", content: text });
    }
  });

  sock.ev.on("messages.reaction", (reactions) => {
    for (const { reaction } of reactions) {
      const jid = reaction.key?.remoteJid;
      const senderJid = reaction.key?.participant ?? reaction.key?.remoteJid;

      if (!jid?.endsWith("@g.us") || reaction.key?.fromMe || !senderJid) {
        continue;
      }

      if (!reaction.text) {
        // reaction.text vazio significa que a reação foi removida.
        continue;
      }

      void recordEvent({ whatsappGroupId: jid, senderJid, type: "reaction", content: reaction.text });
    }
  });
}
