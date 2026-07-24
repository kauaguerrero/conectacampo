import { Cake, Gift, Plus, ShieldCheck, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { CopyMessageButton } from "./copy-message-button";
import { DeleteRecognitionButton } from "./delete-recognition-button";
import { RecognitionDialog } from "./recognition-dialog";
import { SendRecognitionButton } from "./send-recognition-button";
import { SentToggle } from "./sent-toggle";
import { formatCountdown, suggestedMessage } from "./utils";
import type { RecognitionType } from "./actions";

const TYPE_META: Record<RecognitionType, { label: string; icon: LucideIcon; chip: string; border: string }> = {
  aniversario: {
    label: "Aniversário",
    icon: Cake,
    chip: "bg-chart-3/15 text-chart-3",
    border: "border-l-chart-3",
  },
  destaque: {
    label: "Destaque",
    icon: Star,
    chip: "bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2",
    border: "border-l-chart-2",
  },
  marco_seguranca: {
    label: "Marco de segurança",
    icon: ShieldCheck,
    chip: "bg-chart-1/15 text-chart-1",
    border: "border-l-chart-1",
  },
};

interface RecognitionRow {
  id: string;
  group_id: string;
  member_id: string;
  type: RecognitionType;
  note: string | null;
  scheduled_for: string;
  sent: boolean;
  members: { name: string } | null;
  groups: { name: string } | null;
}

export default async function ReconhecimentosPage() {
  const supabase = await createClient();
  const now = new Date();

  const [{ data: groups }, { data: members }, { data: recognitions, error }] = await Promise.all([
    supabase.from("groups").select("id, name, profile").order("name"),
    supabase.from("members").select("id, group_id, name").order("name"),
    supabase
      .from("recognitions")
      .select("id, group_id, member_id, type, note, scheduled_for, sent, members(name), groups(name)")
      .order("scheduled_for", { ascending: true }),
  ]);

  const rows = (recognitions as RecognitionRow[] | null) ?? [];
  const upcoming = rows.filter((r) => !r.sent);
  const history = [...rows.filter((r) => r.sent)].sort(
    (a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reconhecimentos"
        subtitle='Clique em "Enviar reconhecimento" para mandar direto pro grupo, ou copie a mensagem e envie do seu jeito.'
        action={
          <RecognitionDialog
            groups={groups ?? []}
            members={members ?? []}
            trigger={
              <Button disabled={!members || members.length === 0}>
                <Plus /> Novo reconhecimento
              </Button>
            }
          />
        }
      />

      {!members || members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre membros primeiro (tela Membros) antes de criar reconhecimentos.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">Erro ao carregar reconhecimentos: {error.message}</p> : null}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Próximos</h2>
        <div className="flex flex-col gap-3">
          {upcoming.map((item) => {
            const countdown = formatCountdown(item.scheduled_for, now);
            const message = suggestedMessage(item.type, item.members?.name ?? "—", item.note);
            const meta = TYPE_META[item.type];
            return (
              <Card key={item.id} className={`border-l-4 ${countdown.overdue ? "border-l-destructive" : meta.border}`}>
                <CardContent className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
                        <meta.icon className="size-4.5" />
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">
                          {item.members?.name ?? "—"}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {item.groups?.name ?? "—"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <Badge variant={countdown.overdue ? "destructive" : "secondary"} className="text-sm">
                      {countdown.label}
                    </Badge>
                  </div>
                  <p className="rounded-xl bg-muted/60 p-3 text-sm">{message}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Data marcada: {new Date(item.scheduled_for).toLocaleString("pt-BR")}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <SendRecognitionButton id={item.id} />
                      <CopyMessageButton text={message} />
                      <RecognitionDialog
                        mode="edit"
                        groups={groups ?? []}
                        members={members ?? []}
                        recognition={item}
                        trigger={
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        }
                      />
                      <SentToggle id={item.id} sent={item.sent} />
                      <DeleteRecognitionButton id={item.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="font-medium">Nada pendente 🎉</p>
                <p className="mt-1 text-sm text-muted-foreground">Cadastre um novo reconhecimento acima.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Já enviados</h2>
        <Card>
          <CardContent className="pt-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => {
                  const meta = TYPE_META[item.type];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.members?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.groups?.name ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}
                        >
                          <meta.icon className="size-3" />
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(item.scheduled_for).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <SentToggle id={item.id} sent={item.sent} />
                        <DeleteRecognitionButton id={item.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Nenhum reconhecimento enviado ainda.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
