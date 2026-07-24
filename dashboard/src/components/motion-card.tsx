import { Card } from "@/components/ui/card";
import { HoverLift } from "@/components/hover-lift";
import { cn } from "@/lib/utils";

// Card com o mesmo efeito de hover (leve elevação + sombra) usado nos
// cartões de KPI — usado nos cards maiores do painel (gráficos, listas).
export function MotionCard({ className, children, ...props }: React.ComponentProps<typeof Card>) {
  return (
    <HoverLift className="rounded-2xl">
      <Card className={cn("h-full transition-colors duration-200", className)} {...props}>
        {children}
      </Card>
    </HoverLift>
  );
}
