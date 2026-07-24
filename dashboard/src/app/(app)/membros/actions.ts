"use server";

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
