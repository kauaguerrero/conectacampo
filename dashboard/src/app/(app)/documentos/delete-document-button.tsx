"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "./actions";

export function DeleteDocumentButton({ id, filePath }: { id: string; filePath: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteDocument(id, filePath);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
      } else {
        toast.success("Documento excluído.");
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
