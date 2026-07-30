"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createMember(formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthdayDate = String(formData.get("birthday_date") ?? "").trim();

  if (!groupId) return { error: "Escolha um grupo." };
  if (!name) return { error: "O nome é obrigatório." };
  if (!phone) return { error: "O telefone é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    group_id: groupId,
    name,
    phone,
    birthday_date: birthdayDate || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/membros");
  return {};
}

export async function updateMember(id: string, formData: FormData): Promise<{ error?: string }> {
  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthdayDate = String(formData.get("birthday_date") ?? "").trim();

  if (!groupId) return { error: "Escolha um grupo." };
  if (!name) return { error: "O nome é obrigatório." };
  if (!phone) return { error: "O telefone é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ group_id: groupId, name, phone, birthday_date: birthdayDate || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/membros");
  return {};
}

export async function setMemberActive(id: string, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ active }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/membros");
  return {};
}

export async function deleteMember(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/membros");
  return {};
}

async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${process.env.WORKER_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${process.env.WORKER_SECRET}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
}

export interface ParsedMemberRow {
  rowNumber: number;
  name: string;
  phone: string;
  birthdayDate: string | null;
  groupId: string | null;
  groupName: string | null;
  status: "ok" | "duplicado" | "sem_grupo" | "invalido";
  issue?: string;
}

const HEADER_ALIASES = {
  phone: ["telefone", "phone", "numero", "celular", "whatsapp"],
  name: ["nome", "name"],
  birthday: ["nascimento", "aniversario", "birthday"],
};

function normalizeHeader(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return "";
  const value = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
    if ("text" in value) return String((value as { text: unknown }).text ?? "");
    if ("result" in value) return String((value as { result: unknown }).result ?? "");
  }
  return String(value);
}

function parseBirthday(cell: ExcelJS.Cell | undefined): string | null {
  if (!cell) return null;
  const value = cell.value;
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const text = cellText(cell).trim();
  const brMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export async function parseMembersFile(
  formData: FormData,
): Promise<{ rows: ParsedMemberRow[] } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Selecione um arquivo." };

  const workbook = new ExcelJS.Workbook();
  try {
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
  } catch {
    return { error: "Não consegui ler o arquivo. Confira se é uma planilha Excel (.xlsx) válida." };
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    return { error: "A planilha está vazia. Adicione ao menos uma linha de membro abaixo do cabeçalho." };
  }

  const columns: { phone?: number; name?: number; birthday?: number } = {};
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = normalizeHeader(cellText(cell));
    if (!columns.phone && HEADER_ALIASES.phone.some((alias) => header.includes(alias))) columns.phone = colNumber;
    if (!columns.name && HEADER_ALIASES.name.some((alias) => header.includes(alias))) columns.name = colNumber;
    if (!columns.birthday && HEADER_ALIASES.birthday.some((alias) => header.includes(alias))) columns.birthday = colNumber;
  });

  if (!columns.phone || !columns.name) {
    return {
      error:
        'Não encontrei as colunas obrigatórias. A planilha precisa ter uma coluna de "Telefone" e uma de "Nome" no cabeçalho (linha 1).',
    };
  }

  const supabase = await createClient();

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name, whatsapp_group_id");
  if (groupsError) return { error: groupsError.message };
  if (!groups || groups.length === 0) {
    return { error: "Nenhum grupo configurado ainda. Configure os grupos em Configurações antes de importar." };
  }

  const participantsRes = await workerFetch("/whatsapp/groups/participants", {
    method: "POST",
    body: JSON.stringify({ ids: groups.map((g) => g.whatsapp_group_id) }),
  }).catch(() => null);

  if (!participantsRes || !participantsRes.ok) {
    const body = await participantsRes?.json().catch(() => null);
    return {
      error:
        body?.error ??
        "Não foi possível consultar os grupos do WhatsApp. Verifique se ele está conectado em Configurações.",
    };
  }

  const { participants } = (await participantsRes.json()) as { participants: Record<string, string[]> };

  const phoneToGroup = new Map<string, { id: string; name: string }>();
  for (const group of groups) {
    for (const phone of participants[group.whatsapp_group_id] ?? []) {
      if (!phoneToGroup.has(phone)) phoneToGroup.set(phone, { id: group.id, name: group.name });
    }
  }

  const { data: existingMembers, error: existingError } = await supabase.from("members").select("group_id, phone");
  if (existingError) return { error: existingError.message };
  const existingSet = new Set((existingMembers ?? []).map((m) => `${m.group_id}:${m.phone}`));

  const seenInFile = new Set<string>();
  const rows: ParsedMemberRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const name = cellText(row.getCell(columns.name)).trim();
    const phone = cellText(row.getCell(columns.phone)).replace(/\D/g, "");
    const birthdayDate = columns.birthday ? parseBirthday(row.getCell(columns.birthday)) : null;

    if (!name && !phone) continue; // linha em branco

    if (!name || !phone) {
      rows.push({
        rowNumber,
        name,
        phone,
        birthdayDate,
        groupId: null,
        groupName: null,
        status: "invalido",
        issue: !name ? "Nome em branco" : "Telefone em branco ou inválido",
      });
      continue;
    }

    const match = phoneToGroup.get(phone);
    if (!match) {
      rows.push({
        rowNumber,
        name,
        phone,
        birthdayDate,
        groupId: null,
        groupName: null,
        status: "sem_grupo",
        issue: "Telefone não encontrado em nenhum grupo do WhatsApp conectado",
      });
      continue;
    }

    const key = `${match.id}:${phone}`;
    if (existingSet.has(key) || seenInFile.has(key)) {
      rows.push({
        rowNumber,
        name,
        phone,
        birthdayDate,
        groupId: match.id,
        groupName: match.name,
        status: "duplicado",
        issue: existingSet.has(key) ? "Já cadastrado nesse grupo" : "Duplicado na própria planilha",
      });
      continue;
    }

    seenInFile.add(key);
    rows.push({ rowNumber, name, phone, birthdayDate, groupId: match.id, groupName: match.name, status: "ok" });
  }

  return { rows };
}

export async function importMembers(
  rows: ParsedMemberRow[],
): Promise<{ inserted: number; total: number } | { error: string }> {
  const valid = rows.filter((r) => r.status === "ok" && r.groupId);
  if (valid.length === 0) return { error: "Nenhum membro válido pra importar." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .upsert(
      valid.map((r) => ({ group_id: r.groupId, name: r.name, phone: r.phone, birthday_date: r.birthdayDate })),
      { onConflict: "group_id,phone", ignoreDuplicates: true },
    )
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/membros");
  return { inserted: data?.length ?? 0, total: valid.length };
}
