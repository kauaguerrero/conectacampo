"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { setMemberActive } from "./actions";

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await setMemberActive(id, !active);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="cursor-pointer">
      <Badge variant={active ? "default" : "outline"}>{active ? "Ativo" : "Inativo"}</Badge>
    </button>
  );
}
