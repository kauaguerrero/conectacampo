import {
  Cake,
  CheckCheck,
  ClipboardCheck,
  Clock,
  Gift,
  Lightbulb,
  MessageCircle,
  MessageSquarePlus,
  Moon,
  Send,
  Sparkles,
  ThumbsUp,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityAreaChart, ContentTypeChart, GroupComparisonChart } from "@/components/charts";
import { DashboardHero } from "@/components/dashboard-hero";
import { KpiStatCard } from "@/components/kpi-stat-card";
import { MotionCard as Card } from "@/components/motion-card";
import { QuickActionCard } from "@/components/quick-action-card";
import { createClient } from "@/lib/supabase/server";
import { getDashboardKpis } from "@/lib/kpis";

const RECOGNITION_LABELS: Record<string, string> = {
  aniversario: "Aniversário",
  destaque: "Destaque",
  marco_seguranca: "Marco de segurança",
};

const PROFILE_LABELS: Record<string, string> = {
  operador: "Operadores",
  tratorista: "Tratoristas",
};

const MEDALS = ["bg-chart-2 text-[oklch(0.3_0.08_80)]", "bg-muted text-muted-foreground", "bg-chart-3/25 text-chart-3"];

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default async function HomePage() {
  const supabase = await createClient();
  const [kpis, { count: pendingApprovals }] = await Promise.all([
    getDashboardKpis(),
    supabase.from("send_queue").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
  ]);
  const { summary } = kpis;
  const pendingCount = pendingApprovals ?? 0;

  const groupChartData = kpis.byGroup.map((g) => ({
    name: g.name,
    resposta: Math.round((g.avgResponseRate ?? 0) * 100),
    reacao: Math.round((g.avgReactionRate ?? 0) * 100),
  }));

  const contentChartData = kpis.byContentType.map((t) => ({
    label: t.label,
    engajamento: Math.round((t.avgEngagementRate ?? 0) * 100),
    envios: t.count,
  }));

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        title="Painel da comunidade"
        subtitle={`${today.charAt(0).toUpperCase() + today.slice(1)} · últimos ${kpis.window.sentPostsDays} dias`}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ações rápidas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pendingCount > 0 ? (
            <QuickActionCard
              href="/aprovacoes"
              icon={ClipboardCheck}
              title="Você tem mensagens aguardando aprovação!"
              description="Clique aqui para aprovar."
              tone="alert"
              badge={pendingCount}
            />
          ) : (
            <QuickActionCard
              href="/aprovacoes"
              icon={ClipboardCheck}
              title="Aprovações em dia"
              description="Nada esperando sua revisão agora."
              tone="calm"
            />
          )}
          <QuickActionCard
            href="/envios"
            icon={MessageSquarePlus}
            title="Novo envio"
            description="Manda uma mensagem ou enquete agora pro grupo."
            tone="sky"
          />
          <QuickActionCard
            href="/temas"
            icon={Lightbulb}
            title="Temas para a IA"
            description="Cadastre aqui os temas que você quer que a IA escreva sobre."
            tone="warning"
          />
          <QuickActionCard
            href="/reconhecimentos"
            icon={Gift}
            title="Reconhecimentos"
            description="Aniversários, destaques e marcos de segurança."
            tone="violet"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Indicadores</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStatCard title="Mensagens enviadas" value={String(summary.messagesSent)} icon={Send} tone="green" />
        <KpiStatCard
          title="Entrega da fila"
          value={pct(summary.deliveryRate)}
          description="Envios confirmados vs. falhados"
          icon={CheckCheck}
          tone="sky"
        />
        <KpiStatCard
          title="Membros ativos"
          value={`${summary.activeMembers} / ${summary.totalMembers}`}
          description="Cadastrados como ativos"
          icon={Users}
          tone="violet"
        />
        <KpiStatCard
          title="Aprovação de conteúdo IA"
          value={pct(summary.aiApprovalRate)}
          description={
            summary.aiApprovalSampleSize > 0
              ? `${summary.aiApprovalSampleSize} decisões no período`
              : "Ainda sem decisões registradas"
          }
          icon={Sparkles}
          tone="amber"
        />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
              <Clock className="size-4" />
            </span>
            <div>
              <CardTitle>Próximos envios</CardTitle>
              <CardDescription>
                Já aprovados, aguardando o horário chegar para o worker enviar
                {summary.queuedCount > 5 ? ` — ${summary.queuedCount} no total` : ""}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {kpis.upcomingQueue.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.groupName}</p>
                <p className="truncate text-xs text-muted-foreground">{item.preview}</p>
              </div>
              <Badge variant={item.overdue ? "destructive" : "secondary"}>
                {new Date(item.scheduledFor).toLocaleString("pt-BR")}
                {item.overdue ? " · atrasado" : ""}
              </Badge>
            </div>
          ))}
          {kpis.upcomingQueue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nada na fila agora.</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiStatCard
          title="Taxa de resposta"
          value={pct(summary.avgResponseRate)}
          description="Respostas únicas por post, janela de 24h"
          icon={MessageCircle}
          tone="green"
        />
        <KpiStatCard
          title="Taxa de reação"
          value={pct(summary.avgReactionRate)}
          description="Reações únicas por post, janela de 24h"
          icon={ThumbsUp}
          tone="amber"
        />
        <KpiStatCard
          title="Participação em enquete"
          value={pct(summary.avgPollParticipationRate)}
          description="Votos únicos por enquete, janela de 24h"
          icon={Vote}
          tone="sky"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade da comunidade</CardTitle>
          <CardDescription>Respostas, reações e votos por dia nos últimos 30 dias.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityAreaChart data={kpis.activityTimeline} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engajamento por grupo</CardTitle>
            <CardDescription>Comparativo entre os grupos da comunidade.</CardDescription>
          </CardHeader>
          <CardContent>
            {groupChartData.length > 0 ? (
              <GroupComparisonChart data={groupChartData} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum grupo cadastrado ainda.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {kpis.byGroup.map((g) => (
                <Badge key={g.groupId} variant="secondary" className="font-normal">
                  {g.name} · {PROFILE_LABELS[g.profile]} · {g.activeMembers} ativos · {g.messagesSent} envios
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>O que funciona melhor</CardTitle>
            <CardDescription>Engajamento médio por tipo de conteúdo — use isso pra decidir o que postar.</CardDescription>
          </CardHeader>
          <CardContent>
            {contentChartData.length > 0 ? (
              <>
                <ContentTypeChart data={contentChartData} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {contentChartData.map((t) => `${t.label}: ${t.envios} envio${t.envios === 1 ? "" : "s"}`).join(" · ")}
                </p>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum envio nos últimos 30 dias.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-chart-2/20 text-[oklch(0.55_0.13_80)]">
                <Trophy className="size-4" />
              </span>
              <div>
                <CardTitle>Destaques da comunidade</CardTitle>
                <CardDescription>Mais engajados nos últimos {kpis.window.rankingDays} dias.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {kpis.topEngaged.map((m, index) => (
              <div key={m.memberId} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${MEDALS[index] ?? "bg-muted text-muted-foreground"}`}
                >
                  {index + 1}º
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.groupName}</p>
                </div>
                <Badge variant="secondary">{m.interactions} interações</Badge>
              </div>
            ))}
            {kpis.topEngaged.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Ainda sem interações registradas.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-chart-5/15 text-chart-5">
                <Moon className="size-4" />
              </span>
              <div>
                <CardTitle>Quem anda quieto</CardTitle>
                <CardDescription>Ativos sem interação há 60+ dias — vale um contato pessoal.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {kpis.silentMembers.map((m) => (
              <div key={m.memberId} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.groupName}</p>
                </div>
                {m.daysSinceLastActivity === null ? (
                  <Badge variant="outline">Nunca engajou</Badge>
                ) : (
                  <Badge variant="outline">{m.daysSinceLastActivity} dias atrás</Badge>
                )}
              </div>
            ))}
            {kpis.silentMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Todo mundo engajou recentemente. 👏</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
                <Cake className="size-4" />
              </span>
              <div>
                <CardTitle>Aniversários chegando</CardTitle>
                <CardDescription>Próximos 30 dias.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {kpis.upcomingBirthdays.map((m) => (
              <div key={m.memberId} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.groupName}</p>
                </div>
                <Badge variant={m.daysUntil <= 3 ? "default" : "secondary"}>
                  {m.daysUntil === 0 ? "Hoje 🎉" : `em ${m.daysUntil} dia${m.daysUntil === 1 ? "" : "s"}`}
                </Badge>
              </div>
            ))}
            {kpis.upcomingBirthdays.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum aniversário no período.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1">
                <Gift className="size-4" />
              </span>
              <div>
                <CardTitle>Reconhecimentos pendentes</CardTitle>
                <CardDescription>Cadastrados e aguardando envio manual.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {kpis.pendingRecognitions.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.memberName}</p>
                  <p className="truncate text-xs text-muted-foreground">{RECOGNITION_LABELS[r.type] ?? r.type}</p>
                </div>
                <Badge variant={r.overdue ? "destructive" : "secondary"}>
                  {new Date(r.scheduledFor).toLocaleDateString("pt-BR")}
                  {r.overdue ? " · atrasado" : ""}
                </Badge>
              </div>
            ))}
            {kpis.pendingRecognitions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nada pendente.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
