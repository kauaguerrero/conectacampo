import { startCron } from "./gemini/cron.js";
import { logger } from "./logger.js";
import { startQueueProcessor } from "./queue.js";
import { startServer } from "./server.js";
import { startWhatsApp } from "./whatsapp.js";

startServer();
startQueueProcessor();
startCron();

startWhatsApp().catch((err) => {
  logger.error(err, "Falha ao iniciar conexão com o WhatsApp.");
  process.exit(1);
});
