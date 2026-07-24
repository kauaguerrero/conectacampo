"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateScheduledMessage(id: string, formData: FormData): Promise<{ error?: string }> {
  const text = String(formData.get("text") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduled_for") ?? "");

  if (!text) return { error: "O texto não pode ficar vazio." };
  if (!scheduledForRaw || Number.isNaN(Date.parse(scheduledForRaw))) {
    return { error: "Escolha uma data/hora válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("send_queue")
    .update({ content: { type: "text", text }, scheduled_for: new Date(scheduledForRaw).toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendario");
  revalidatePath("/aprovacoes");
  revalidatePath("/envios");
  return {};
}

// Item ainda não aprovado: mantém a linha (como em /aprovacoes) pra não
// distorcer o KPI de taxa de aprovação de IA. Item já aprovado: apaga
// mesmo, já passou da decisão de aprovação.
export async function cancelScheduledMessage(id: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  if (status === "pending_approval") {
    const { error } = await supabase
      .from("send_queue")
      .update({
        status: "failed",
        error_message: "Cancelado pelo instrutor pelo calendário.",
        ai_feedback: "negative",
      })
      .eq("id", id)
      .eq("status", "pending_approval");
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("send_queue").delete().eq("id", id).neq("status", "sent");
    if (error) return { error: error.message };
  }

  revalidatePath("/calendario");
  revalidatePath("/aprovacoes");
  revalidatePath("/envios");
  return {};
}
