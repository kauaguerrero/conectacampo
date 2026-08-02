import fs from "node:fs/promises";
import { Boom } from "@hapi/boom";
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import qrcodeTerminal from "qrcode-terminal";
import { config } from "./config.js";
import { registerEngagementListeners } from "./engagement.js";
import { logger } from "./logger.js";

export type ConnectionStatus = "connecting" | "open" | "close" | "logged_out";

export interface ConnectedUser {
  id: string;
  name: string | null;
}

export const connectionState: {
  status: ConnectionStatus;
  lastError?: string;
  qr: string | null;
  qrImage: string | null;
  // true assim que um QR já foi mostrado nesta tentativa de conexão — usado
  // pra distinguir "gerando o primeiro QR" de "QR escaneado, finalizando
  // pareamento" quando qrImage volta a ficar null sem a conexão ter aberto.
  hadQr: boolean;
  user: ConnectedUser | null;
} = {
  status: "close",
  qr: null,
  qrImage: null,
  hadQr: false,
  user: null,
};

let currentSock: WASocket | undefined;

// Fica true entre um logout intencional (via /whatsapp/logout) e o próximo
// /whatsapp/connect — evita que o handler de reconexão automática tente
// reconectar sozinho logo depois de um logout de propósito.
let awaitingManualConnect = false;

// Cooldown entre tentativas manuais de conexão (via /whatsapp/connect). Sem
// isso, um cliente clicando "Conectar" repetidamente enquanto o WhatsApp
// rejeita o pareamento (ex.: 401 antes de sequer gerar QR) gera uma rajada de
// tentativas em segundos — o que piora um bloqueio temporário do lado do
// WhatsApp em vez de esperar ele passar.
const RECONNECT_COOLDOWN_MS = 30_000;
let nextConnectAllowedAt = 0;

export class ConnectCooldownError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    super(`Aguarde ${retryAfterSeconds}s antes de tentar conectar de novo.`);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getSocket(): WASocket | undefined {
  return currentSock;
}

// Logger separado e mais silencioso pro Baileys: seus logs internos (sync de
// histórico, protocolo, etc.) não têm valor operacional no dia a dia e afogam
// os eventos que a gente realmente quer ver (conectado, QR, erro).
const baileysLogger = pino({ level: "warn" });

// Limpa só o conteúdo de auth_state, sem remover o diretório em si: em
// produção ele é o mount point de um volume do Fly.io, e um rmdir nele
// falha com EBUSY (device busy) por ser a raiz de um filesystem montado.
async function clearAuthState(): Promise<void> {
  await fs.mkdir(config.authStatePath, { recursive: true });
  const entries = await fs.readdir(config.authStatePath);
  await Promise.all(
    entries.map((entry) => fs.rm(`${config.authStatePath}/${entry}`, { recursive: true, force: true })),
  );
}

async function connect(): Promise<void> {
  awaitingManualConnect = false;
  connectionState.status = "connecting";
  connectionState.qr = null;
  connectionState.qrImage = null;
  connectionState.hadQr = false;

  const { state, saveCreds } = await useMultiFileAuthState(config.authStatePath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: baileysLogger,
    browser: ["Alta Mogiana", "Chrome", "1.0.0"],
    // Por padrão o Baileys manda presença "online" ao conectar, o que faz o
    // WhatsApp tratar esse dispositivo vinculado como "ativo" e suprimir as
    // notificações push do celular (mesmo efeito de deixar o WhatsApp Web
    // aberto). Desligando isso, o celular volta a notificar normalmente.
    markOnlineOnConnect: false,
  });
  currentSock = sock;

  sock.ev.on("creds.update", saveCreds);
  registerEngagementListeners(sock);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("QR code recebido, escaneie para autenticar (também disponível em /whatsapp/status).");
      qrcodeTerminal.generate(qr, { small: true });
      connectionState.qr = qr;
      connectionState.hadQr = true;
      void QRCode.toDataURL(qr)
        .then((dataUrl) => {
          connectionState.qrImage = dataUrl;
        })
        .catch((err) => logger.error({ err }, "Falha ao gerar imagem do QR code."));
    } else if (connection && connection !== "open" && connectionState.qrImage) {
      // Chegou uma atualização sem QR novo enquanto ainda mostrávamos um —
      // sinal de que o QR foi escaneado e o pareamento está em andamento.
      // Limpa pra não deixar um QR já usado/expirado na tela.
      connectionState.qr = null;
      connectionState.qrImage = null;
    }

    if (connection === "open") {
      connectionState.status = "open";
      connectionState.lastError = undefined;
      connectionState.qr = null;
      connectionState.qrImage = null;
      connectionState.user = sock.user ? { id: sock.user.id, name: sock.user.name ?? null } : null;
      logger.info({ user: connectionState.user }, "Conectado ao WhatsApp.");
    }

    if (connection === "close") {
      currentSock = undefined;
      connectionState.user = null;
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      connectionState.lastError = lastDisconnect?.error?.message;

      logger.warn({ statusCode, loggedOut }, "Conexão com o WhatsApp encerrada.");

      if (loggedOut) {
        connectionState.status = "logged_out";
        // Sessão inválida (ex.: aparelho removido em "Aparelhos conectados"
        // no celular) — apaga a credencial salva na hora, senão a próxima
        // tentativa de conexão reusa esse mesmo creds.json e leva outro 401
        // sem nunca chegar a gerar um QR novo.
        void clearAuthState().catch((err) =>
          logger.error({ err }, "Falha ao limpar sessão do WhatsApp após logout forçado."),
        );
        return;
      }

      connectionState.status = "close";

      if (awaitingManualConnect) {
        return;
      }

      logger.info("Reconectando ao WhatsApp...");
      void connect();
    }
  });
}

// Chamado no boot do worker — só reabre a conexão sozinho se já existir uma
// sessão pareada salva (sobrevive a redeploys/reinícios via volume). Sem
// sessão salva, fica parado em "close" esperando o clique em "Conectar" no
// dashboard: tentar parear sozinho a cada boot gastava tentativas contra o
// rate-limit de pareamento do WhatsApp sem nenhum QR pra escanear.
export async function startWhatsApp(): Promise<void> {
  const { state } = await useMultiFileAuthState(config.authStatePath);
  if (state.creds.registered) {
    await connect();
  } else {
    logger.info('Nenhuma sessão do WhatsApp salva — aguardando clique em "Conectar" no dashboard.');
  }
}

// Chamado pelo endpoint POST /whatsapp/connect — reconecta do zero (gera QR
// novo se a sessão tiver sido deslogada, ou retoma a sessão salva se ainda
// for válida).
export async function reconnectWhatsApp(): Promise<void> {
  if (currentSock) {
    return;
  }

  const now = Date.now();
  if (now < nextConnectAllowedAt) {
    throw new ConnectCooldownError(nextConnectAllowedAt - now);
  }
  nextConnectAllowedAt = now + RECONNECT_COOLDOWN_MS;

  await connect();
}

// Chamado pelo endpoint POST /whatsapp/logout — desvincula o número (avisa o
// WhatsApp) e apaga a sessão salva em disco, pra próxima conexão pedir um QR
// novo. Só mexe em auth_state depois de confirmar que o socket foi encerrado.
export async function logoutAndClearSession(): Promise<void> {
  awaitingManualConnect = true;

  if (currentSock) {
    try {
      await currentSock.logout();
    } catch (err) {
      logger.warn({ err }, "Erro ao deslogar do WhatsApp (seguindo com a limpeza da sessão local).");
    }
    currentSock = undefined;
  }

  connectionState.status = "logged_out";
  connectionState.user = null;
  connectionState.qr = null;
  connectionState.qrImage = null;

  await clearAuthState();

  logger.info("Sessão do WhatsApp deslogada e apagada.");
}
