"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setGenerationWeekday } from "./actions";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function WeekdayPicker({ initialValue }: { initialValue: number }) {
  const [selected, setSelected] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSelect(value: number) {
    if (value === selected) return;
    const previous = selected;
    setSelected(value);
    startTransition(async () => {
      const result = await setGenerationWeekday(value);
      if (result.error) {
        toast.error(result.error);
        setSelected(previous);
      } else {
        toast.success("Dia de geração atualizado.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => (
        <Button
          key={day.value}
          type="button"
          variant={selected === day.value ? "default" : "outline"}
          size="sm"
          disabled={isPending}
          onClick={() => handleSelect(day.value)}
        >
          {day.label}
        </Button>
      ))}
    </div>
  );
}
