"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface WhatsAppStatus {
  status: "connecting" | "open" | "close" | "logged_out";
  lastError: string | null;
  qrImage: string | null;
  hadQr: boolean;
  user: { id: string; name: string | null } | null;
}

async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${process.env.WORKER_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${process.env.WORKER_SECRET}` },
    cache: "no-store",
  });
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus | { error: string }> {
  try {
    const res = await workerFetch("/whatsapp/status");
    if (!res.ok) return { error: `Erro ${res.status} ao consultar o worker.` };
    return (await res.json()) as WhatsAppStatus;
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }
}

export async function connectWhatsApp(): Promise<{ error?: string }> {
  try {
    const res = await workerFetch("/whatsapp/connect", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      return { error: body.error ?? `Erro ${res.status} ao conectar.` };
    }
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }

  revalidatePath("/configuracoes");
  return {};
}

export async function logoutWhatsApp(): Promise<{ error?: string }> {
  try {
    const res = await workerFetch("/whatsapp/logout", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      return { error: body.error ?? `Erro ${res.status} ao deslogar.` };
    }
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }

  revalidatePath("/configuracoes");
  return {};
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  participants: number;
}

export async function listWhatsAppGroups(): Promise<{ groups: WhatsAppGroup[] } | { error: string }> {
  try {
    const res = await workerFetch("/whatsapp/groups");
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      return { error: body.error ?? `Erro ${res.status} ao listar grupos.` };
    }
    return (await res.json()) as { groups: WhatsAppGroup[] };
  } catch {
    return { error: "Não foi possível falar com o worker. Ele está rodando?" };
  }
}

export type GroupProfile = "operador" | "tratorista";

export async function selectGroupForProfile(
  profile: GroupProfile,
  whatsappGroupId: string,
  name: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: existing, error: findError } = await supabase
    .from("groups")
    .select("id")
    .eq("profile", profile)
    .maybeSingle();

  if (findError) return { error: findError.message };

  const { error } = existing
    ? await supabase.from("groups").update({ whatsapp_group_id: whatsappGroupId, name }).eq("id", existing.id)
    : await supabase.from("groups").insert({ whatsapp_group_id: whatsappGroupId, name, profile });

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  return {};
}
