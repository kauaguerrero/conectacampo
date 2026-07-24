import { schedule } from "node-cron";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { supabase } from "../supabase.js";
import { generateWeek } from "./content-generator.js";

// Roda todo dia às 8h e só efetivamente gera conteúdo se hoje for o dia da
// semana configurado pelo instrutor em Configurações (`app_settings`,
// 0=domingo ... 6=sábado, padrão domingo). Checar todo dia em vez de agendar
// um cron fixo no dia certo permite trocar o dia pelo dashboard sem precisar
// reiniciar o worker.
const DAILY_CHECK_CRON = "0 8 * * *";

async function getConfiguredWeekday(): Promise<number> {
  const { data, error } = await supabase.from("app_settings").select("generation_weekday").eq("id", true).single();

  if (error) {
    logger.error({ error }, "Falha ao ler app_settings — usando domingo (0) como padrão.");
    return 0;
  }

  return data.generation_weekday;
}

export function startCron(): void {
  if (!config.geminiApiKey) {
    logger.warn("GEMINI_API_KEY não configurada — cron de geração de conteúdo desligado.");
    return;
  }

  schedule(
    DAILY_CHECK_CRON,
    () => {
      void (async () => {
        const configuredWeekday = await getConfiguredWeekday();
        const today = new Date().getDay();

        if (today !== configuredWeekday) {
          return;
        }

        await generateWeek().catch((err) => logger.error({ err }, "Falha no cron semanal de geração de conteúdo."));
      })();
    },
    { timezone: config.cronTimezone },
  );

  logger.info(
    { timezone: config.cronTimezone },
    "Checagem diária do cron de geração de conteúdo iniciada (roda o dia configurado em Configurações, 8h).",
  );
}
