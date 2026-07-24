import { Brain, Settings2 } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { KNOWLEDGE_BASE_THRESHOLD } from "./constants";
import { LearningModePicker } from "./learning-mode-picker";
import { WeekdayPicker } from "./weekday-picker";
import { WhatsAppConnectionSkeleton } from "./whatsapp-connection-skeleton";
import { WhatsAppSection } from "./whatsapp-section";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [{ data: settings, error }, { count: knowledgeBaseCount }] = await Promise.all([
    supabase.from("app_settings").select("generation_weekday, generation_mode").eq("id", true).single(),
    supabase
      .from("send_queue")
      .select("id", { count: "exact", head: true })
      .eq("source", "ai_generated")
      .not("ai_feedback", "is", null),
  ]);

  const count = knowledgeBaseCount ?? 0;
  const canActivateRobusto = count >= KNOWLEDGE_BASE_THRESHOLD;
  const progressPct = Math.min(100, Math.round((count / KNOWLEDGE_BASE_THRESHOLD) * 100));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" subtitle="Ajustes gerais do Conecta Campo." />

      {error ? <p className="text-sm text-destructive">Erro ao carregar configurações: {error.message}</p> : null}

      <Suspense fallback={<WhatsAppConnectionSkeleton />}>
        <WhatsAppSection />
      </Suspense>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
              <Settings2 className="size-4" />
            </span>
            <div>
              <CardTitle>Geração de conteúdo semanal</CardTitle>
              <CardDescription>
                Em que dia da semana a IA deve gerar as mensagens dos próximos dias úteis (segunda a sexta) pra você
                aprovar tudo de uma vez.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <WeekdayPicker initialValue={settings?.generation_weekday ?? 0} />
          <p className="mt-3 text-xs text-muted-foreground">
            No dia escolhido, às 8h, o worker gera as mensagens da semana: segunda, quarta e sexta para o grupo
            Operadores, e terça, quinta e sexta para o grupo Tratoristas. Todas caem em Aprovações já agendadas para
            o dia certo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-chart-5/15 text-chart-5">
              <Brain className="size-4" />
            </span>
            <div>
              <CardTitle>Aprendizado da IA</CardTitle>
              <CardDescription>
                Toda vez que você aprova, edita ou descarta uma mensagem gerada, isso vira um sinal de feedback pra
                próxima geração ficar mais parecida com o seu gosto.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LearningModePicker
            initialValue={(settings?.generation_mode as "simples" | "robusto") ?? "simples"}
            canActivateRobusto={canActivateRobusto}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base de conhecimento</span>
              <Badge variant="secondary">
                {count} / {KNOWLEDGE_BASE_THRESHOLD} mensagens
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-chart-5 transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {!canActivateRobusto ? (
            <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Recomendação:</span> ainda não é o momento de ativar o
              modo robusto. Aguarde mais mensagens acumularem (faltam {KNOWLEDGE_BASE_THRESHOLD - count}) — com pouco
              dado, a busca por mensagens parecidas não tem o que buscar direito. O modo simples já funciona bem
              nesse meio tempo.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Base de conhecimento suficiente pro modo robusto. Ele ainda usa a mesma lógica do modo simples por
              baixo dos panos — a busca semântica em si é a próxima etapa a ser construída.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
