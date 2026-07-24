import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { ApproveDialog } from "./approve-dialog";
import { RejectButton } from "./reject-button";

interface QueueRow {
  id: string;
  content: { type?: string; text?: string } | null;
  scheduled_for: string;
  created_at: string;
  groups: { name: string } | null;
}

export default async function AprovacoesPage() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("send_queue")
    .select("id, content, scheduled_for, created_at, groups(name)")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  const rows = (items as QueueRow[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aprovações"
        subtitle="Conteúdo gerado por IA aguardando sua revisão. Nada vai pro grupo sem o seu OK."
        action={
          rows.length > 0 ? (
            <Badge className="bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2">
              {rows.length} aguardando
            </Badge>
          ) : undefined
        }
      />

      {error ? <p className="text-sm text-destructive">Erro ao carregar a fila: {error.message}</p> : null}

      <div className="flex flex-col gap-3">
        {rows.map((item) => {
          const text = item.content?.text ?? "";
          const groupName = item.groups?.name ?? "—";
          return (
            <Card key={item.id} className="border-l-4 border-l-chart-2">
              <CardContent className="flex flex-col gap-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2">
                      <Sparkles className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold">{groupName}</p>
                      <p className="text-xs text-muted-foreground">
                        Gerado em {new Date(item.created_at).toLocaleString("pt-BR")} · agendado para{" "}
                        {new Date(item.scheduled_for).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ApproveDialog
                      item={{ id: item.id, text, scheduled_for: item.scheduled_for, groupName }}
                      trigger={<Button size="sm">Revisar e aprovar</Button>}
                    />
                    <RejectButton id={item.id} />
                  </div>
                </div>
                <p className="rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-wrap">{text}</p>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && !error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium">Tudo em dia ✅</p>
              <p className="mt-1 text-sm text-muted-foreground">Nada aguardando aprovação no momento.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
