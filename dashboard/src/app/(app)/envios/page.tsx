import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { SendForm } from "./send-form";

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  sent: "Enviado",
  failed: "Falhou",
};

const STATUS_CLASSES: Record<string, string> = {
  pending_approval: "bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2",
  approved: "bg-chart-4/15 text-chart-4",
  sent: "bg-chart-1/15 text-chart-1",
  failed: "bg-destructive/12 text-destructive",
};

interface SendQueueHistoryRow {
  id: string;
  content: { type?: string; text?: string; question?: string };
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  groups: { name: string } | null;
}

export default async function EnviosPage() {
  const supabase = await createClient();

  const [{ data: groups }, { data: templates }, { data: history }] = await Promise.all([
    supabase.from("groups").select("id, name, profile").order("name"),
    supabase.from("templates").select("id, name, type, content").order("name"),
    supabase
      .from("send_queue")
      .select("id, content, status, scheduled_for, sent_at, error_message, created_at, groups(name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo envio" subtitle="Escolha o grupo, o conteúdo e quando enviar." />

      {groups && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo cadastrado ainda. Cadastre um grupo direto no banco antes de enviar mensagens.
        </p>
      ) : (
        <Card>
          <CardContent className="pt-1">
            <SendForm groups={groups ?? []} templates={templates ?? []} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
              <History className="size-4" />
            </span>
            <CardTitle>Últimos envios</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agendado para</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history as SendQueueHistoryRow[] | null)?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.groups?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {item.content?.type === "poll" ? `📊 ${item.content.question}` : item.content?.text}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[item.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    {item.status === "failed" && item.error_message ? (
                      <p className="mt-1 text-xs text-destructive">{item.error_message}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {history?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum envio ainda.
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
