"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
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
import { cancelScheduledMessage, updateScheduledMessage } from "./actions";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending_approval: {
    label: "Aguardando aprovação",
    className: "bg-chart-2/25 text-[oklch(0.42_0.1_80)] dark:text-chart-2",
  },
  approved: { label: "Agendado", className: "bg-chart-4/20 text-chart-4" },
  sent: { label: "Enviado", className: "bg-chart-1/20 text-chart-1" },
};

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export interface CalendarEvent {
  id: string;
  content: { type?: string; text?: string; question?: string; options?: string[] } | null;
  status: string;
  scheduled_for: string;
  groups: { name: string } | null;
}

export function EventChip({ event }: { event: CalendarEvent }) {
  const [open, setOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [isCanceling, startCancel] = useTransition();

  const isPoll = event.content?.type === "poll";
  const isSent = event.status === "sent";
  const meta = STATUS_META[event.status] ?? { label: event.status, className: "bg-muted text-muted-foreground" };

  const [state, formAction, isSaving] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => updateScheduledMessage(event.id, formData),
    {},
  );
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isSaving && !state.error) {
      setOpen(false);
      toast.success("Mensagem atualizada.");
    }
    wasPending.current = isSaving;
  }, [isSaving, state.error]);

  function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    startCancel(async () => {
      const result = await cancelScheduledMessage(event.id, event.status);
      if (result.error) {
        toast.error(result.error);
        setConfirmingCancel(false);
      } else {
        toast.success("Agendamento cancelado.");
        setOpen(false);
      }
    });
  }

  const timeLabel = new Date(event.scheduled_for).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const preview = isPoll ? `📊 ${event.content?.question ?? ""}` : (event.content?.text ?? "—");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setConfirmingCancel(false);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className={`w-full truncate rounded-md px-1.5 py-0.5 text-left text-[0.7rem] font-medium ${meta.className}`}
            title={preview}
          >
            {timeLabel} · {event.groups?.name ?? "—"}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event.groups?.name ?? "—"}</DialogTitle>
          <DialogDescription>
            {meta.label} · {new Date(event.scheduled_for).toLocaleString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <p className="rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-wrap">{preview}</p>
        ) : isPoll ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <p className="font-medium">{event.content?.question}</p>
              <p className="mt-1 text-muted-foreground">{event.content?.options?.join(" / ")}</p>
            </div>
            <p className="text-xs text-muted-foreground">Enquetes não podem ser editadas por aqui — só canceladas.</p>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`text-${event.id}`}>Mensagem</Label>
              <Textarea
                id={`text-${event.id}`}
                name="text"
                rows={6}
                defaultValue={event.content?.text ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`scheduled_for-${event.id}`}>Data de envio</Label>
              <Input
                id={`scheduled_for-${event.id}`}
                name="scheduled_for"
                type="datetime-local"
                defaultValue={toLocalInputValue(event.scheduled_for)}
                required
              />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        )}

        {!isSent ? (
          <DialogFooter>
            <Button
              variant={confirmingCancel ? "destructive" : "outline"}
              onClick={handleCancel}
              onBlur={() => setConfirmingCancel(false)}
              disabled={isCanceling}
            >
              {isCanceling ? "Cancelando..." : confirmingCancel ? "Confirmar cancelamento?" : "Cancelar agendamento"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
