"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createDocument(
  name: string,
  equipment: string,
  filePath: string,
  fileSize: number,
): Promise<{ error?: string }> {
  if (!name.trim()) return { error: "O nome é obrigatório." };
  if (!equipment.trim()) return { error: "O equipamento é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    name: name.trim(),
    equipment: equipment.trim(),
    file_path: filePath,
    file_size: fileSize,
  });

  if (error) {
    await supabase.storage.from("documents").remove([filePath]);
    return { error: error.message };
  }

  revalidatePath("/documentos");
  return {};
}

export async function deleteDocument(id: string, filePath: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error: storageError } = await supabase.storage.from("documents").remove([filePath]);
  if (storageError) return { error: storageError.message };

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/documentos");
  return {};
}
