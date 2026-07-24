"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setRecognitionSent } from "./actions";

export function SentToggle({ id, sent }: { id: string; sent: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await setRecognitionSent(id, !sent);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(sent ? "Marcado como pendente." : "Marcado como enviado.");
      }
    });
  }

  return (
    <Button variant={sent ? "outline" : "default"} size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Salvando..." : sent ? "Desfazer envio" : "Marcar como enviado"}
    </Button>
  );
}
