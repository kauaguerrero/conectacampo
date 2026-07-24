import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { HoverLift } from "@/components/hover-lift";
import { cn } from "@/lib/utils";

const TONES = {
  alert: {
    chip: "bg-destructive/15 text-destructive",
    border: "border-l-destructive",
    title: "text-destructive",
  },
  warning: {
    chip: "bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2",
    border: "border-l-chart-2",
    title: "text-foreground",
  },
  calm: {
    chip: "bg-chart-1/15 text-chart-1",
    border: "border-l-chart-1",
    title: "text-foreground",
  },
  green: {
    chip: "bg-chart-1/15 text-chart-1",
    border: "border-l-chart-1",
    title: "text-foreground",
  },
  sky: {
    chip: "bg-chart-4/15 text-chart-4",
    border: "border-l-chart-4",
    title: "text-foreground",
  },
  violet: {
    chip: "bg-chart-5/15 text-chart-5",
    border: "border-l-chart-5",
    title: "text-foreground",
  },
} as const;

export function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  tone = "calm",
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: keyof typeof TONES;
  badge?: string | number;
}) {
  const style = TONES[tone];

  return (
    <HoverLift className="rounded-2xl">
      <Link
        href={href}
        className={cn(
          "flex h-full items-start gap-3 rounded-2xl border-l-4 bg-card p-4 ring-1 ring-foreground/8",
          style.border,
        )}
      >
        <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-xl", style.chip)}>
          <Icon className="size-5" />
          {badge ? (
            <span className="absolute -top-1.5 -right-1.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[0.7rem] leading-none font-bold text-white tabular-nums">
              {badge}
            </span>
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm leading-snug font-semibold", style.title)}>{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/50" />
      </Link>
    </HoverLift>
  );
}
