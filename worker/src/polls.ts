import { decryptPollVote, getKeyAuthor, jidNormalizedUser, sha256 } from "@whiskeysockets/baileys";
import type { proto, WAMessage, WASocket } from "@whiskeysockets/baileys";
import type { PollContent } from "./content.js";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";

function pollCreationContent(message: proto.IMessage | null | undefined) {
  return message?.pollCreationMessage ?? message?.pollCreationMessageV2 ?? message?.pollCreationMessageV3 ?? null;
}

// Envia a enquete e persiste o contexto (message secret + opções) necessário
// pra decifrar votos depois — ver comentário na migration `poll_messages`.
export async function sendPollAndPersist(
  sock: WASocket,
  jid: string,
  sendQueueId: string,
  content: PollContent,
): Promise<WAMessage> {
  const result = await sock.sendMessage(jid, {
    poll: { name: content.question, values: content.options, selectableCount: 1 },
  });

  if (!result?.key?.id) {
    return result as WAMessage;
  }

  const creation = pollCreationContent(result.message);
  const messageSecret = result.message?.messageContextInfo?.messageSecret;

  if (!creation || !messageSecret) {
    logger.error(
      { sendQueueId },
      "Enquete enviada mas sem messageSecret/pollCreationMessage — votos não serão capturados.",
    );
    return result;
  }

  // Usa o LID (Linked ID) do usuário, não o JID de número de telefone: é a
  // forma que o app do WhatsApp usa pra assinar/decifrar votos de enquete
  // hoje em dia (rollout do sistema LID) — confirmado empiricamente, já que
  // `participant` nos eventos de voto chega em formato `@lid`.
  const meId = jidNormalizedUser(sock.user?.lid ?? sock.user?.id ?? "");
  const pollCreatorJid = getKeyAuthor(result.key, meId);

  const { error } = await supabase.from("poll_messages").insert({
    send_queue_id: sendQueueId,
    message_id: result.key.id,
    remote_jid: jid,
    poll_creator_jid: pollCreatorJid,
    message_secret: Buffer.from(messageSecret).toString("base64"),
    options: content.options,
  });

  if (error) {
    logger.error({ error, sendQueueId }, "Falha ao salvar contexto da enquete para captura de votos.");
  }

  return result;
}

export interface PollVoteResult {
  sendQueueId: string;
  voterJid: string;
  selectedOptions: string[];
}

// Chamado a partir do listener de `messages.upsert` quando chega um
// `pollUpdateMessage` (voto). Retorna null se a enquete não foi enviada por
// nós (sem contexto salvo) ou se a decifragem falhar.
export async function decodePollVote(
  meId: string,
  pollUpdateContent: proto.Message.IPollUpdateMessage,
  updateKey: proto.IMessageKey,
): Promise<PollVoteResult | null> {
  const creationKey = pollUpdateContent.pollCreationMessageKey;
  if (!creationKey?.id || !creationKey.remoteJid || !pollUpdateContent.vote) {
    return null;
  }

  const { data: pollMessage, error } = await supabase
    .from("poll_messages")
    .select("send_queue_id, poll_creator_jid, message_secret, options")
    .eq("message_id", creationKey.id)
    .eq("remote_jid", creationKey.remoteJid)
    .maybeSingle();

  if (error) {
    logger.error({ error, creationKey }, "Falha ao buscar contexto da enquete para decifrar voto.");
    return null;
  }
  if (!pollMessage) {
    // Enquete não foi enviada por nós (ou o registro foi perdido) — ignora.
    return null;
  }

  const voterJid = getKeyAuthor(updateKey, meId);

  try {
    const voteMsg = decryptPollVote(pollUpdateContent.vote, {
      pollCreatorJid: pollMessage.poll_creator_jid,
      pollMsgId: creationKey.id,
      pollEncKey: Buffer.from(pollMessage.message_secret, "base64"),
      voterJid,
    });

    const options = pollMessage.options as string[];
    const hashToName = new Map(options.map((name) => [sha256(Buffer.from(name)).toString(), name]));
    const selectedOptions = (voteMsg.selectedOptions ?? [])
      .map((hash) => hashToName.get(Buffer.from(hash).toString()))
      .filter((name): name is string => Boolean(name));

    return { sendQueueId: pollMessage.send_queue_id, voterJid, selectedOptions };
  } catch (err) {
    logger.warn({ err, creationKey }, "Falha ao decifrar voto de enquete.");
    return null;
  }
}
