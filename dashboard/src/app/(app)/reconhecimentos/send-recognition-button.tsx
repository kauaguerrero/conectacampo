"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendRecognition } from "./actions";

export function SendRecognitionButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await sendRecognition(id);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
      } else {
        toast.success("Reconhecimento enviado pro grupo! 🎉");
      }
    });
  }

  return (
    <Button size="sm" onClick={handleClick} onBlur={() => setConfirming(false)} disabled={isPending}>
      <Send />
      {isPending ? "Enviando..." : confirming ? "Confirmar envio?" : "Enviar reconhecimento"}
    </Button>
  );
}
