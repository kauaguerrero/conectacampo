"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { setTopicPriority } from "./actions";

export function PriorityToggle({ id, priority }: { id: string; priority: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await setTopicPriority(id, !priority);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="cursor-pointer">
      <Badge variant={priority ? "default" : "outline"}>{priority ? "Próximo" : "Fila normal"}</Badge>
    </button>
  );
}
