"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${process.env.WORKER_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${process.env.WORKER_SECRET}` },
    cache: "no-store",
  });
}

export interface GenerationLimitStatus {
  count: number;
  limit: number;
}

export async function getGenerationLimitStatus(): Promise<GenerationLimitStatus | { error: string }> {
  try {
    const res = await workerFetch("/generate/limit");
    if (!res.ok) return { error: `Erro ${res.status} ao consultar o limite.` };
    return (await res.json()) as GenerationLimitStatus;
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }
}

export interface GeneratedMessage {
  id: string;
  text: string;
  scheduledFor: string;
  count: number;
  limit: number;
}

export async function generateAdHocMessage(
  groupId: string,
  scheduledForIso: string,
): Promise<GeneratedMessage | { error: string }> {
  try {
    const res = await workerFetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, scheduled_for: scheduledForIso }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error ?? `Erro ${res.status} ao gerar mensagem.` };
    return body as GeneratedMessage;
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }
}

export async function approveGeneratedNow(
  id: string,
  text: string,
  scheduledForIso: string,
): Promise<{ error?: string }> {
  try {
    const res = await workerFetch(`/queue/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { type: "text", text }, scheduled_for: scheduledForIso }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      return { error: body.error ?? `Erro ${res.status} ao aprovar.` };
    }
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }

  revalidatePath("/calendario");
  revalidatePath("/aprovacoes");
  revalidatePath("/envios");
  return {};
}

export async function saveGeneratedForLater(id: string, text: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("send_queue").update({ content: { type: "text", text } }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/calendario");
  revalidatePath("/aprovacoes");
  return {};
}

export async function rejectGenerated(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("send_queue")
    .update({ status: "failed", error_message: "Descartado pelo instrutor.", ai_feedback: "negative" })
    .eq("id", id)
    .eq("status", "pending_approval");

  if (error) return { error: error.message };

  revalidatePath("/calendario");
  revalidatePath("/aprovacoes");
  return {};
}
