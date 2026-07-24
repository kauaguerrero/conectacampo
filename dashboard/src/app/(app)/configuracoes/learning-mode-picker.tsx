"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setGenerationMode } from "./actions";

type Mode = "simples" | "robusto";

export function LearningModePicker({
  initialValue,
  canActivateRobusto,
}: {
  initialValue: Mode;
  canActivateRobusto: boolean;
}) {
  const [selected, setSelected] = useState<Mode>(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSelect(mode: Mode) {
    if (mode === selected) return;
    if (mode === "robusto" && !canActivateRobusto) return;

    const previous = selected;
    setSelected(mode);
    startTransition(async () => {
      const result = await setGenerationMode(mode);
      if (result.error) {
        toast.error(result.error);
        setSelected(previous);
      } else {
        toast.success("Modo de aprendizado atualizado.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={selected === "simples" ? "default" : "outline"}
        size="sm"
        disabled={isPending}
        onClick={() => handleSelect("simples")}
      >
        Simples (few-shot)
      </Button>
      <Button
        type="button"
        variant={selected === "robusto" ? "default" : "outline"}
        size="sm"
        disabled={isPending || !canActivateRobusto}
        onClick={() => handleSelect("robusto")}
      >
        Robusto (busca semântica)
      </Button>
    </div>
  );
}
