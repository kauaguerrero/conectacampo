"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TemplateType = "texto" | "reconhecimento" | "enquete";

export interface TextContent {
  text: string;
}

export interface PollContent {
  question: string;
  options: string[];
}

function parseContent(type: TemplateType, formData: FormData): TextContent | PollContent {
  if (type === "enquete") {
    const question = String(formData.get("question") ?? "").trim();
    const options = String(formData.get("options") ?? "")
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (!question) {
      throw new Error("A pergunta da enquete é obrigatória.");
    }
    if (options.length < 2) {
      throw new Error("A enquete precisa de pelo menos 2 opções (uma por linha).");
    }

    return { question, options };
  }

  const text = String(formData.get("text") ?? "").trim();
  if (!text) {
    throw new Error("O texto é obrigatório.");
  }

  return { text };
}

export async function createTemplate(formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as TemplateType;

  if (!name) {
    return { error: "O nome é obrigatório." };
  }
  if (!["texto", "reconhecimento", "enquete"].includes(type)) {
    return { error: "Tipo inválido." };
  }

  let content: TextContent | PollContent;
  try {
    content = parseContent(type, formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Conteúdo inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("templates").insert({ name, type, content });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/templates");
  return {};
}

export async function updateTemplate(id: string, formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as TemplateType;

  if (!name) {
    return { error: "O nome é obrigatório." };
  }
  if (!["texto", "reconhecimento", "enquete"].includes(type)) {
    return { error: "Tipo inválido." };
  }

  let content: TextContent | PollContent;
  try {
    content = parseContent(type, formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Conteúdo inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("templates").update({ name, type, content }).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/templates");
  return {};
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/templates");
  return {};
}
