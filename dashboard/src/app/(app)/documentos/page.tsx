import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { DeleteDocumentButton } from "./delete-document-button";
import { UploadDocumentDialog } from "./upload-document-dialog";

interface DocumentRow {
  id: string;
  name: string;
  equipment: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentosPage() {
  const supabase = await createClient();

  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, name, equipment, file_path, file_size, created_at")
    .order("created_at", { ascending: false });

  const rows = (documents as DocumentRow[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documentos"
        subtitle="Manuais técnicos (PDF) que a IA usa como referência real ao gerar conteúdo sobre um equipamento."
        action={
          <UploadDocumentDialog
            trigger={
              <Button>
                <Plus /> Novo documento
              </Button>
            }
          />
        }
      />

      {error ? <p className="text-sm text-destructive">Erro ao carregar documentos: {error.message}</p> : null}

      <Card>
        <CardContent className="pt-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Equipamento</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chart-4/15 text-chart-4">
                        <FileText className="size-4" />
                      </span>
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{doc.equipment}</TableCell>
                  <TableCell className="text-muted-foreground">{formatBytes(doc.file_size)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="flex justify-end">
                    <DeleteDocumentButton id={doc.id} filePath={doc.file_path} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !error ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum documento enviado ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
