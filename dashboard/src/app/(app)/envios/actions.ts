"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface TextTemplateContent {
  text?: string;
}

interface PollTemplateContent {
  question?: string;
  options?: string[];
}

type SendContent = { type: "text"; text: string } | { type: "poll"; question: string; options: string[] };

function parsePollOptions(raw: string): string[] {
  return raw
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

export async function createSend(formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("group_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const templateId = String(formData.get("template_id") ?? "");
  const freeText = String(formData.get("text") ?? "").trim();
  const when = String(formData.get("when") ?? "now");
  const scheduledForRaw = String(formData.get("scheduled_for") ?? "");

  if (!groupId) {
    return { error: "Escolha um grupo." };
  }

  let content: SendContent;

  if (mode === "template") {
    if (!templateId) {
      return { error: "Escolha um template." };
    }

    const supabase = await createClient();
    const { data: template, error } = await supabase
      .from("templates")
      .select("type, content")
      .eq("id", templateId)
      .single();

    if (error || !template) {
      return { error: "Template não encontrado." };
    }

    if (template.type === "enquete") {
      const pollContent = template.content as PollTemplateContent;
      if (!pollContent.question || !pollContent.options || pollContent.options.length < 2) {
        return { error: "Template de enquete inválido (faltando pergunta ou opções)." };
      }
      content = { type: "poll", question: pollContent.question, options: pollContent.options };
    } else {
      const text = (template.content as TextTemplateContent).text ?? "";
      if (!text) {
        return { error: "Template sem texto." };
      }
      content = { type: "text", text };
    }
  } else if (mode === "enquete") {
    const question = String(formData.get("question") ?? "").trim();
    const options = parsePollOptions(String(formData.get("options") ?? ""));

    if (!question) {
      return { error: "Escreva a pergunta da enquete." };
    }
    if (options.length < 2) {
      return { error: "A enquete precisa de pelo menos 2 opções (uma por linha)." };
    }
    content = { type: "poll", question, options };
  } else {
    if (!freeText) {
      return { error: "Escreva o texto da mensagem." };
    }
    content = { type: "text", text: freeText };
  }

  let scheduledFor: string | undefined;
  if (when === "agendado") {
    if (!scheduledForRaw || Number.isNaN(Date.parse(scheduledForRaw))) {
      return { error: "Escolha uma data/hora válida para agendar." };
    }
    scheduledFor = new Date(scheduledForRaw).toISOString();
  }

  const res = await fetch(`${process.env.WORKER_URL}/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WORKER_SECRET}`,
    },
    body: JSON.stringify({
      group_id: groupId,
      template_id: mode === "template" ? templateId : undefined,
      content,
      scheduled_for: scheduledFor,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
    return { error: body.error ?? `Erro ${res.status} ao enviar para o worker.` };
  }

  revalidatePath("/envios");
  return {};
}
