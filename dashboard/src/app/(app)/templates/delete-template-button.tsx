"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTemplate } from "./actions";

export function DeleteTemplateButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteTemplate(id);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
      } else {
        toast.success("Template excluído.");
      }
    });
  }

  return (
    <Button
      variant={confirming ? "destructive" : "ghost"}
      size="sm"
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={isPending}
    >
      {isPending ? "Excluindo..." : confirming ? "Confirmar?" : "Excluir"}
    </Button>
  );
}
