"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTopic(formData: FormData): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = formData.get("priority") === "on";
  const isSearch = formData.get("is_search") === "on";

  if (!title) return { error: "O título é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("topics").insert({
    title,
    description: description || null,
    priority,
    is_search: isSearch,
  });

  if (error) return { error: error.message };

  revalidatePath("/temas");
  return {};
}

export async function updateTopic(id: string, formData: FormData): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = formData.get("priority") === "on";
  const isSearch = formData.get("is_search") === "on";

  if (!title) return { error: "O título é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("topics")
    .update({ title, description: description || null, priority, is_search: isSearch })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/temas");
  return {};
}

export async function setTopicPriority(id: string, priority: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").update({ priority }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/temas");
  return {};
}

export async function deleteTopic(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/temas");
  return {};
}
