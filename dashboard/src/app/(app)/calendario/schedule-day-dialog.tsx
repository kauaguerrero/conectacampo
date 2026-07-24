"use client";

import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  approveGeneratedNow,
  generateAdHocMessage,
  getGenerationLimitStatus,
  rejectGenerated,
  saveGeneratedForLater,
  type GenerationLimitStatus,
} from "./generation-actions";

interface Group {
  id: string;
  name: string;
  profile: string;
}

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultScheduledFor(day: Date): Date {
  const d = new Date(day);
  d.setHours(8, 0, 0, 0);
  return d;
}

function barTone(pct: number): string {
  if (pct >= 0.8) return "bg-destructive";
  if (pct >= 0.5) return "bg-chart-2";
  return "bg-chart-1";
}

export function ScheduleDayDialog({ day, groups }: { day: Date; groups: Group[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [limitStatus, setLimitStatus] = useState<GenerationLimitStatus | { error: string } | null>(null);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ id: string; text: string; scheduledFor: string } | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGenerated(null);
    setGroupId(groups[0]?.id ?? "");
    getGenerationLimitStatus().then(setLimitStatus);
  }, [open, groups]);

  async function handleGenerate() {
    if (!groupId) {
      toast.error("Escolha um grupo.");
      return;
    }
    setIsGenerating(true);
    const scheduledFor = defaultScheduledFor(day);
    const result = await generateAdHocMessage(groupId, scheduledFor.toISOString());
    setIsGenerating(false);

    if ("error" in result) {
      toast.error(result.error);
      getGenerationLimitStatus().then(setLimitStatus);
      return;
    }

    setGenerated({ id: result.id, text: result.text, scheduledFor: result.scheduledFor });
    setLimitStatus({ count: result.count, limit: result.limit });
  }

  async function handleApproveNow() {
    if (!generated) return;
    setIsDeciding(true);
    const result = await approveGeneratedNow(generated.id, generated.text, generated.scheduledFor);
    setIsDeciding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Aprovado — vai pro grupo no horário agendado.");
    setOpen(false);
    router.refresh();
  }

  async function handleSaveForLater() {
    if (!generated) return;
    setIsDeciding(true);
    const result = await saveGeneratedForLater(generated.id, generated.text);
    setIsDeciding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Salvo em Aprovações pra revisar depois.");
    setOpen(false);
    router.refresh();
  }

  async function handleReject() {
    if (!generated) return;
    setIsDeciding(true);
    const result = await rejectGenerated(generated.id);
    setIsDeciding(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Descartado.");
    setOpen(false);
    router.refresh();
  }

  const hasLimitError = limitStatus && "error" in limitStatus;
  const blocked = limitStatus && !hasLimitError && limitStatus.count >= limitStatus.limit;
  const pct = limitStatus && !hasLimitError ? Math.min(1, limitStatus.count / limitStatus.limit) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded-md py-1 text-[0.7rem] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3" /> Programar envio
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Programar envio — {day.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</DialogTitle>
          <DialogDescription>Gera uma mensagem por IA pra esse dia e decide na hora o que fazer com ela.</DialogDescription>
        </DialogHeader>

        {limitStatus && !hasLimitError ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Gerações de IA hoje</span>
              <span>
                {limitStatus.count} / {limitStatus.limit}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] ${barTone(pct)}`}
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
          </div>
        ) : hasLimitError ? (
          <p className="text-sm text-destructive">{limitStatus.error}</p>
        ) : null}

        {blocked ? (
          <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            Limite diário de gerações por IA atingido. Aguarde até amanhã pra gerar mais mensagens (você ainda pode
            criar um envio manual em Novo envio).
          </p>
        ) : !generated ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group_id">Grupo</Label>
              <Select value={groupId} onValueChange={(v) => setGroupId(v ?? "")}>
                <SelectTrigger id="group_id" className="w-full">
                  <SelectValue placeholder="Escolha o grupo">
                    {(value: string | null) => groups.find((g) => g.id === value)?.name ?? "Escolha o grupo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.profile})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating || !groupId}>
              <Sparkles /> {isGenerating ? "Gerando..." : "Gerar mensagem"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="generated_text">Mensagem gerada</Label>
              <Textarea
                id="generated_text"
                rows={6}
                value={generated.text}
                onChange={(e) => setGenerated({ ...generated, text: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="generated_scheduled_for">Data de envio</Label>
              <Input
                id="generated_scheduled_for"
                type="datetime-local"
                defaultValue={toLocalInputValue(new Date(generated.scheduledFor))}
                onChange={(e) =>
                  setGenerated((prev) => (prev ? { ...prev, scheduledFor: new Date(e.target.value).toISOString() } : prev))
                }
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={handleApproveNow} disabled={isDeciding} className="w-full">
                Aprovar já
              </Button>
              <div className="flex w-full gap-2">
                <Button variant="outline" onClick={handleSaveForLater} disabled={isDeciding} className="flex-1">
                  Aprovar depois
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={isDeciding} className="flex-1">
                  Recusar direto
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
