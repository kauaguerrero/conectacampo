import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  authStatePath: process.env.AUTH_STATE_PATH ?? "./auth_state",
  logLevel: process.env.LOG_LEVEL ?? "info",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  workerSecret: required("WORKER_SECRET"),

  queuePollIntervalMs: Number(process.env.QUEUE_POLL_INTERVAL_MS ?? 5000),
  queueBatchSize: Number(process.env.QUEUE_BATCH_SIZE ?? 10),
  queueMaxAttempts: Number(process.env.QUEUE_MAX_ATTEMPTS ?? 3),
  queueRetryBaseMs: Number(process.env.QUEUE_RETRY_BASE_MS ?? 30_000),

  // Opcional: sem essa chave, o cron de geração de conteúdo fica desligado
  // (o worker continua funcionando normalmente para envio manual/fila).
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest",
  cronTimezone: process.env.CRON_TIMEZONE ?? "America/Sao_Paulo",
};
