import { logger } from "../logger.js";
import { supabase } from "../supabase.js";

export interface Topic {
  id: string;
  title: string;
  description: string | null;
}

// Prioriza temas marcados como "próximo" pelo instrutor (mais antigo primeiro,
// entre os prioritários); na ausência deles, pega o tema menos usado
// recentemente. Retorna null se não houver nenhum tema cadastrado.
export async function selectTopic(): Promise<Topic | null> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, title, description")
    .order("priority", { ascending: false })
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ error }, "Falha ao selecionar tema para geração de conteúdo.");
    return null;
  }

  return data;
}

export async function markTopicUsed(id: string): Promise<void> {
  const { error } = await supabase
    .from("topics")
    .update({ last_used_at: new Date().toISOString(), priority: false })
    .eq("id", id);

  if (error) {
    logger.error({ error, id }, "Falha ao marcar tema como usado.");
  }
}
