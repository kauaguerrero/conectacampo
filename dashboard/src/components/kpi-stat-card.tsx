import type { LucideIcon } from "lucide-react";
import { HoverLift } from "@/components/hover-lift";
import { cn } from "@/lib/utils";

const TONES = {
  green: "bg-chart-1/15 text-chart-1",
  amber: "bg-chart-2/20 text-[oklch(0.55_0.13_80)] dark:text-chart-2",
  orange: "bg-chart-3/15 text-chart-3",
  sky: "bg-chart-4/15 text-chart-4",
  violet: "bg-chart-5/15 text-chart-5",
  red: "bg-destructive/12 text-destructive",
} as const;

export type StatTone = keyof typeof TONES;

export function KpiStatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "green",
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  return (
    <HoverLift className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/8">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </HoverLift>
  );
}
