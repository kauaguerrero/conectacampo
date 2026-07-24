// Script utilitário de uso manual: lista os grupos que a sessão autenticada
// participa, com o whatsapp_group_id (JID) usado na tabela `groups`.
//
// Reaproveita a auth_state já salva (não gera novo QR), então o worker
// principal (`pnpm dev`) precisa estar PARADO antes de rodar este script —
// duas conexões simultâneas na mesma sessão conflitam.
//
// Uso: pnpm list-groups

import { fetchLatestBaileysVersion, makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import { config } from "../config.js";

async function main(): Promise<void> {
  const { state } = await useMultiFileAuthState(config.authStatePath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "warn" }),
  });

  await new Promise<void>((resolve, reject) => {
    sock.ev.on("connection.update", (update) => {
      if (update.connection === "open") {
        resolve();
        return;
      }
      if (update.connection === "close") {
        reject(
          new Error(
            "Conexão fechada antes de abrir. Rode `pnpm dev` pelo menos uma vez e autentique via QR antes de usar este script.",
          ),
        );
      }
    });
  });

  const groups = await sock.groupFetchAllParticipating();
  const list = Object.values(groups).map((g) => ({
    whatsapp_group_id: g.id,
    name: g.subject,
    participants: g.participants.length,
  }));

  console.table(list);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
