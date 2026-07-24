import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { EventChip, type CalendarEvent } from "./event-chip";
import { ScheduleDayDialog } from "./schedule-day-dialog";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthQuery } = await searchParams;
  const now = new Date();
  const [yearStr, monthStr] = (monthQuery ?? monthParam(now)).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  const firstOfMonth = new Date(year, month - 1, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  const gridDays = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const gridEndExclusive = new Date(gridDays[gridDays.length - 1]);
  gridEndExclusive.setDate(gridEndExclusive.getDate() + 1);

  const supabase = await createClient();
  const [{ data, error }, { data: groupsData }] = await Promise.all([
    supabase
      .from("send_queue")
      .select("id, content, status, scheduled_for, groups(name)")
      .in("status", ["pending_approval", "approved", "sent"])
      .gte("scheduled_for", gridStart.toISOString())
      .lt("scheduled_for", gridEndExclusive.toISOString())
      .order("scheduled_for", { ascending: true }),
    supabase.from("groups").select("id, name, profile").order("name"),
  ]);
  const groups = groupsData ?? [];

  const events = (data as unknown as CalendarEvent[] | null) ?? [];
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKey(new Date(event.scheduled_for));
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const prevMonthDate = new Date(year, month - 2, 1);
  const nextMonthDate = new Date(year, month, 1);
  const todayKey = dayKey(now);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendário"
        subtitle="Todas as mensagens agendadas — geradas por IA ou manuais."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/calendario?month=${monthParam(now)}`} />}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={`/calendario?month=${monthParam(prevMonthDate)}`} />}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-32 text-center text-sm font-semibold">
              {MONTH_LABELS[month - 1]} {year}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={`/calendario?month=${monthParam(nextMonthDate)}`} />}
            >
              <ChevronRight />
            </Button>
          </div>
        }
      />

      {error ? <p className="text-sm text-destructive">Erro ao carregar calendário: {error.message}</p> : null}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-2" /> Aguardando aprovação
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-4" /> Agendado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-chart-1" /> Enviado
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
        <div className="grid grid-cols-7 border-b border-foreground/8 bg-muted/40">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`p-2 text-center text-xs font-semibold ${
                i === 0 || i === 6 ? "text-destructive/80" : "text-muted-foreground"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridDays.map((day) => {
            const key = dayKey(day);
            const isCurrentMonth = day.getMonth() === month - 1;
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isPast = day < new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const canSchedule = dayEvents.length === 0 && !isPast && groups.length > 0;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div
                key={key}
                className={`group flex min-h-28 flex-col gap-1 border-b border-r border-foreground/8 p-1.5 last:border-r-0 ${
                  !isCurrentMonth ? "bg-muted/20" : isWeekend ? "bg-destructive/5" : ""
                }`}
              >
                <span
                  className={`self-start rounded-full px-1.5 text-xs font-semibold ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : !isCurrentMonth
                        ? "text-muted-foreground/50"
                        : isWeekend
                          ? "text-destructive"
                          : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventChip key={event.id} event={event} />
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="px-1 text-[0.65rem] text-muted-foreground">+{dayEvents.length - 3} mais</span>
                  ) : null}
                  {canSchedule ? <ScheduleDayDialog day={day} groups={groups} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
