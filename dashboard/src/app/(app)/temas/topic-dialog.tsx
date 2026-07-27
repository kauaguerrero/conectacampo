"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createTopic, updateTopic } from "./actions";

interface TopicDialogProps {
  mode: "create" | "edit";
  topic?: {
    id: string;
    title: string;
    description: string | null;
    priority: boolean;
    isSearch: boolean;
  };
  trigger: React.ReactElement;
}

export function TopicDialog({ mode, topic, trigger }: TopicDialogProps) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState(topic?.priority ?? false);
  const [isSearch, setIsSearch] = useState(topic?.isSearch ?? false);

  const action = async (_prev: { error?: string }, formData: FormData) =>
    mode === "create" ? createTopic(formData) : updateTopic(topic!.id, formData);

  const [state, formAction, isPending] = useActionState(action, {});
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setOpen(false);
      toast.success(mode === "create" ? "Tema cadastrado." : "Tema atualizado.");
    }
    wasPending.current = isPending;
  }, [isPending, state.error, mode]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo tema" : "Editar tema"}</DialogTitle>
          <DialogDescription>
            Assunto para orientar a geração de conteúdo por IA. Marque &quot;Próximo&quot; para furar a fila.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              defaultValue={topic?.title}
              placeholder="Ex: Manutenção preventiva da colhedora CH570"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Detalhes (opcional)</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={topic?.description ?? ""}
              placeholder={
                isSearch
                  ? "Foco da busca, ex: máquinas agrícolas, safra, clima, mercado — Brasil"
                  : "Contexto extra para a IA usar ao gerar o conteúdo"
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_search"
              checked={isSearch}
              onCheckedChange={(checked) => setIsSearch(checked === true)}
            />
            <input type="hidden" name="is_search" value={isSearch ? "on" : "off"} />
            <Label htmlFor="is_search" className="font-normal">
              Buscar novidades atuais (usa o Google Search do Gemini em vez de um tema fixo)
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="priority"
              checked={priority}
              onCheckedChange={(checked) => setPriority(checked === true)}
            />
            <input type="hidden" name="priority" value={priority ? "on" : "off"} />
            <Label htmlFor="priority" className="font-normal">
              Usar este tema no próximo envio gerado
            </Label>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
