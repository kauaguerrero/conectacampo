// Script utilitário de uso manual: dispara a geração de conteúdo por IA sem
// esperar o horário do cron. Útil para testar a integração com o Gemini e a
// fila de aprovação.
//
// Uso: pnpm generate-content operador   (teste imediato, 1 mensagem, scheduled_for = agora)
//      pnpm generate-content tratorista
//      pnpm generate-content week       (lote da semana inteira, como o cron de domingo faz)

import { generateForProfile, generateWeek, type GroupProfile } from "../gemini/content-generator.js";

const arg = process.argv[2];

async function main(): Promise<void> {
  if (arg === "week") {
    await generateWeek();
    console.log("Geração da semana concluída. Confira a tela Aprovações / a tabela send_queue.");
    return;
  }

  const profile = arg as GroupProfile | undefined;
  if (profile !== "operador" && profile !== "tratorista") {
    console.error("Uso: pnpm generate-content <operador|tratorista|week>");
    process.exit(1);
  }

  await generateForProfile(profile);
  console.log(`Geração concluída para o perfil "${profile}". Confira a tela Aprovações / a tabela send_queue.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
