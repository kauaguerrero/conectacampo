import type { RecognitionType } from "./actions";

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_MESSAGES: Record<RecognitionType, (name: string) => string> = {
  aniversario: (name) => `Feliz aniversário, ${name}! 🎉 Desejamos um ótimo dia e um ano de muita saúde e sucesso.`,
  destaque: (name) => `Parabéns, ${name}! Reconhecimento pelo excelente desempenho e dedicação no trabalho.`,
  marco_seguranca: (name) =>
    `Parabéns, ${name}! Mais um marco de segurança alcançado — seu cuidado faz diferença pra toda a equipe.`,
};

export function suggestedMessage(type: RecognitionType, memberName: string, note: string | null): string {
  if (note) return note;
  return DEFAULT_MESSAGES[type](memberName);
}

export function formatCountdown(scheduledFor: string, now: Date): { label: string; overdue: boolean } {
  const scheduled = new Date(scheduledFor);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduledDay = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
  const diffDays = Math.round((scheduledDay.getTime() - today.getTime()) / DAY_MS);

  if (diffDays === 0) return { label: "Hoje", overdue: false };
  if (diffDays > 0) return { label: `Em ${diffDays} dia${diffDays === 1 ? "" : "s"}`, overdue: false };
  return { label: `Atrasado há ${-diffDays} dia${diffDays === -1 ? "" : "s"}`, overdue: true };
}
