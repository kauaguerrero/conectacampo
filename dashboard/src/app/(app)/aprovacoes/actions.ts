"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveItem(id: string, formData: FormData): Promise<{ error?: string }> {
  const text = String(formData.get("text") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduled_for") ?? "");

  if (!text) return { error: "O texto não pode ficar vazio." };
  if (!scheduledForRaw || Number.isNaN(Date.parse(scheduledForRaw))) {
    return { error: "Escolha uma data/hora válida." };
  }

  const res = await fetch(`${process.env.WORKER_URL}/queue/${id}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WORKER_SECRET}`,
    },
    body: JSON.stringify({
      content: { type: "text", text },
      scheduled_for: new Date(scheduledForRaw).toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
    return { error: body.error ?? `Erro ${res.status} ao aprovar no worker.` };
  }

  revalidatePath("/aprovacoes");
  return {};
}

export async function rejectItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  // Mantém a linha (status "failed", attempts 0) em vez de apagar, para
  // alimentar o KPI de taxa de aprovação de conteúdo gerado por IA no /.
  const { error } = await supabase
    .from("send_queue")
    .update({
      status: "failed",
      error_message: "Descartado pelo instrutor antes da aprovação.",
      ai_feedback: "negative",
    })
    .eq("id", id)
    .eq("status", "pending_approval");

  if (error) return { error: error.message };

  revalidatePath("/aprovacoes");
  return {};
}
