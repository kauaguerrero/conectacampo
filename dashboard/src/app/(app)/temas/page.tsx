import { Lightbulb, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { DeleteTopicButton } from "./delete-topic-button";
import { PriorityToggle } from "./priority-toggle";
import { TopicDialog } from "./topic-dialog";

interface TopicRow {
  id: string;
  title: string;
  description: string | null;
  priority: boolean;
  last_used_at: string | null;
  is_search: boolean;
}

export default async function TemasPage() {
  const supabase = await createClient();

  const { data: topics, error } = await supabase
    .from("topics")
    .select("id, title, description, priority, last_used_at, is_search")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = (topics as TopicRow[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Temas"
        subtitle='Assuntos que a IA usa pra gerar conteúdo. Marque um como "Próximo" pra furar a fila.'
        action={
          <TopicDialog
            mode="create"
            trigger={
              <Button>
                <Plus /> Novo tema
              </Button>
            }
          />
        }
      />

      {error ? <p className="text-sm text-destructive">Erro ao carregar temas: {error.message}</p> : null}

      <div className="flex flex-col gap-3">
        {rows.map((topic) => (
          <Card key={topic.id} className={topic.priority ? "border-l-4 border-l-chart-2" : "border-l-4 border-l-transparent"}>
            <CardContent className="flex flex-wrap items-center gap-3 pt-1">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                  topic.priority
                    ? "bg-chart-2/25 text-[oklch(0.5_0.12_80)] dark:text-chart-2"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {topic.is_search ? <Search className="size-4.5" /> : <Lightbulb className="size-4.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{topic.title}</p>
                  {topic.is_search ? <Badge variant="outline">Busca</Badge> : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {topic.description ?? "Sem detalhes"} ·{" "}
                  {topic.last_used_at
                    ? `usado em ${new Date(topic.last_used_at).toLocaleDateString("pt-BR")}`
                    : "nunca usado"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PriorityToggle id={topic.id} priority={topic.priority} />
                <TopicDialog
                  mode="edit"
                  topic={{ ...topic, isSearch: topic.is_search }}
                  trigger={
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  }
                />
                <DeleteTopicButton id={topic.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {rows.length === 0 && !error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Nenhum tema cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sem temas, a IA usa só o contexto genérico dos equipamentos.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
