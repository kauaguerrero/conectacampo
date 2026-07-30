import { logger } from "../logger.js";
import { supabase } from "../supabase.js";

export interface RelevantDocument {
  name: string;
  equipment: string;
  base64: string;
  mimeType: string;
}

interface DocumentRow {
  name: string;
  equipment: string;
  file_path: string;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Bate o texto do tema (título + descrição) contra o campo `equipment` de
// cada documento cadastrado — casamento simples por substring, sem
// embeddings, já que o volume de documentos é baixo.
export async function findRelevantDocument(topicText: string): Promise<RelevantDocument | null> {
  const { data: documents, error } = await supabase.from("documents").select("name, equipment, file_path");

  if (error || !documents || documents.length === 0) {
    return null;
  }

  const normalizedTopic = normalize(topicText);
  const match = (documents as DocumentRow[]).find((doc) =>
    doc.equipment
      .split(",")
      .map((part) => normalize(part.trim()))
      .some((part) => part.length > 0 && normalizedTopic.includes(part)),
  );

  if (!match) return null;

  const { data: file, error: downloadError } = await supabase.storage.from("documents").download(match.file_path);
  if (downloadError || !file) {
    logger.error({ downloadError, filePath: match.file_path }, "Falha ao baixar documento do storage.");
    return null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { name: match.name, equipment: match.equipment, base64: buffer.toString("base64"), mimeType: "application/pdf" };
}
