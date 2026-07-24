"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { KNOWLEDGE_BASE_THRESHOLD } from "./constants";

export async function setGenerationWeekday(weekday: number): Promise<{ error?: string }> {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { error: "Dia inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ generation_weekday: weekday }).eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  return {};
}

export async function setGenerationMode(mode: "simples" | "robusto"): Promise<{ error?: string }> {
  if (mode !== "simples" && mode !== "robusto") {
    return { error: "Modo inválido." };
  }

  const supabase = await createClient();

  if (mode === "robusto") {
    const { count, error: countError } = await supabase
      .from("send_queue")
      .select("id", { count: "exact", head: true })
      .eq("source", "ai_generated")
      .not("ai_feedback", "is", null);

    if (countError) return { error: countError.message };
    if ((count ?? 0) < KNOWLEDGE_BASE_THRESHOLD) {
      return {
        error: `Ainda não é o momento de ativar. Faltam ${KNOWLEDGE_BASE_THRESHOLD - (count ?? 0)} mensagens na base de conhecimento.`,
      };
    }
  }

  const { error } = await supabase.from("app_settings").update({ generation_mode: mode }).eq("id", true);

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  return {};
}
