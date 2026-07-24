import { FileText, Gift, Plus, Vote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { DeleteTemplateButton } from "./delete-template-button";
import { TemplateDialog } from "./template-dialog";
import type { PollContent, TemplateType, TextContent } from "./actions";

const TYPE_META: Record<TemplateType, { label: string; icon: LucideIcon; chip: string; border: string }> = {
  texto: {
    label: "Texto",
    icon: FileText,
    chip: "bg-chart-1/15 text-chart-1",
    border: "border-l-chart-1",
  },
  reconhecimento: {
    label: "Reconhecimento",
    icon: Gift,
    chip: "bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2",
    border: "border-l-chart-2",
  },
  enquete: {
    label: "Enquete",
    icon: Vote,
    chip: "bg-chart-4/15 text-chart-4",
    border: "border-l-chart-4",
  },
};

interface TemplateRow {
  id: string;
  name: string;
  type: TemplateType;
  content: TextContent | PollContent;
  created_at: string;
}

function contentPreview(template: TemplateRow): string {
  if (template.type === "enquete") {
    const content = template.content as PollContent;
    return `${content.question} · ${content.options.join(" / ")}`;
  }
  return (template.content as TextContent).text;
}

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates, error } = await supabase
    .from("templates")
    .select("id, name, type, content, created_at")
    .order("created_at", { ascending: false });

  const rows = (templates as TemplateRow[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Templates"
        subtitle="Blocos reutilizáveis de texto, reconhecimento e enquete."
        action={
          <TemplateDialog
            mode="create"
            trigger={
              <Button>
                <Plus /> Novo template
              </Button>
            }
          />
        }
      />

      {error ? <p className="text-sm text-destructive">Erro ao carregar templates: {error.message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((template) => {
          const meta = TYPE_META[template.type];
          return (
            <Card key={template.id} className={`border-l-4 ${meta.border}`}>
              <CardContent className="flex h-full flex-col gap-3 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.chip}`}>
                      <meta.icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold leading-tight">{template.name}</p>
                      <p className="text-xs text-muted-foreground">{meta.label}</p>
                    </div>
                  </div>
                </div>
                <p className="line-clamp-3 flex-1 rounded-xl bg-muted/60 p-2.5 text-sm text-muted-foreground">
                  {contentPreview(template)}
                </p>
                <div className="flex justify-end gap-2">
                  <TemplateDialog
                    mode="edit"
                    template={template}
                    trigger={
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <DeleteTemplateButton id={template.id} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {rows.length === 0 && !error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Nenhum template ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie blocos reutilizáveis pra agilizar os envios de toda semana.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
