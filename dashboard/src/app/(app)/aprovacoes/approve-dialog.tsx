"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { approveItem } from "./actions";

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

interface ApprovalItem {
  id: string;
  text: string;
  scheduled_for: string;
  groupName: string;
}

export function ApproveDialog({ item, trigger }: { item: ApprovalItem; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => approveItem(item.id, formData),
    {},
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setOpen(false);
      toast.success("Conteúdo aprovado e enviado para a fila de envio.");
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar conteúdo — {item.groupName}</DialogTitle>
          <DialogDescription>Revise o texto gerado pela IA antes de aprovar. Você pode editar.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="text">Texto</Label>
            <Textarea id="text" name="text" rows={6} defaultValue={item.text} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduled_for">Data de envio</Label>
            <Input
              id="scheduled_for"
              name="scheduled_for"
              type="datetime-local"
              defaultValue={toLocalInputValue(item.scheduled_for)}
              required
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Aprovando..." : "Aprovar e enviar para a fila"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
