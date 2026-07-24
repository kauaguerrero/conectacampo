"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { suggestedMessage } from "./utils";

export type RecognitionType = "aniversario" | "destaque" | "marco_seguranca";

const VALID_TYPES: RecognitionType[] = ["aniversario", "destaque", "marco_seguranca"];

export async function createRecognition(formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const type = String(formData.get("type") ?? "") as RecognitionType;
  const note = String(formData.get("note") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduled_for") ?? "");

  if (!groupId) return { error: "Escolha um grupo." };
  if (!memberId) return { error: "Escolha um membro." };
  if (!VALID_TYPES.includes(type)) return { error: "Tipo inválido." };
  if (!scheduledForRaw || Number.isNaN(Date.parse(scheduledForRaw))) {
    return { error: "Escolha uma data/hora válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("recognitions").insert({
    group_id: groupId,
    member_id: memberId,
    type,
    note: note || null,
    scheduled_for: new Date(scheduledForRaw).toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/reconhecimentos");
  return {};
}

export async function updateRecognition(id: string, formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const type = String(formData.get("type") ?? "") as RecognitionType;
  const note = String(formData.get("note") ?? "").trim();
  const scheduledForRaw = String(formData.get("scheduled_for") ?? "");

  if (!groupId) return { error: "Escolha um grupo." };
  if (!memberId) return { error: "Escolha um membro." };
  if (!VALID_TYPES.includes(type)) return { error: "Tipo inválido." };
  if (!scheduledForRaw || Number.isNaN(Date.parse(scheduledForRaw))) {
    return { error: "Escolha uma data/hora válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recognitions")
    .update({
      group_id: groupId,
      member_id: memberId,
      type,
      note: note || null,
      scheduled_for: new Date(scheduledForRaw).toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/reconhecimentos");
  return {};
}

export async function setRecognitionSent(id: string, sent: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recognitions").update({ sent }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/reconhecimentos");
  return {};
}

export async function sendRecognition(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: recognition, error: fetchError } = await supabase
    .from("recognitions")
    .select("group_id, type, note, members(name)")
    .eq("id", id)
    .single();

  if (fetchError || !recognition) {
    return { error: "Reconhecimento não encontrado." };
  }

  const memberName = (recognition.members as unknown as { name: string } | null)?.name ?? "—";
  const text = suggestedMessage(recognition.type as RecognitionType, memberName, recognition.note);

  const res = await fetch(`${process.env.WORKER_URL}/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WORKER_SECRET}`,
    },
    body: JSON.stringify({
      group_id: recognition.group_id,
      content: { type: "text", text },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
    return { error: body.error ?? `Erro ${res.status} ao enviar para o worker.` };
  }

  const { error: updateError } = await supabase.from("recognitions").update({ sent: true }).eq("id", id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/reconhecimentos");
  return {};
}

export async function deleteRecognition(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recognitions").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/reconhecimentos");
  return {};
}
