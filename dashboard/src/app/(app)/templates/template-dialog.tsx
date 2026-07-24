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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTemplate, updateTemplate, type PollContent, type TemplateType, type TextContent } from "./actions";

const TYPE_LABELS: Record<TemplateType, string> = {
  texto: "Texto",
  reconhecimento: "Reconhecimento",
  enquete: "Enquete",
};

interface TemplateDialogProps {
  mode: "create" | "edit";
  template?: {
    id: string;
    name: string;
    type: TemplateType;
    content: TextContent | PollContent;
  };
  trigger: React.ReactElement;
}

export function TemplateDialog({ mode, template, trigger }: TemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TemplateType>(template?.type ?? "texto");

  const action = async (_prev: { error?: string }, formData: FormData) =>
    mode === "create" ? createTemplate(formData) : updateTemplate(template!.id, formData);

  const [state, formAction, isPending] = useActionState(action, {});
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setOpen(false);
      toast.success(mode === "create" ? "Template criado." : "Template atualizado.");
    }
    wasPending.current = isPending;
  }, [isPending, state.error, mode]);

  const textDefault = type !== "enquete" ? (template?.content as TextContent | undefined)?.text ?? "" : "";
  const pollContent = template?.type === "enquete" ? (template.content as PollContent) : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo template" : "Editar template"}</DialogTitle>
          <DialogDescription>
            Blocos reutilizáveis pra usar na tela de novo envio.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={template?.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as TemplateType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue>{(value: TemplateType | null) => (value ? TYPE_LABELS[value] : "")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as TemplateType[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="type" value={type} />
          </div>

          {type === "enquete" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="question">Pergunta</Label>
                <Input id="question" name="question" defaultValue={pollContent?.question} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="options">Opções (uma por linha)</Label>
                <Textarea
                  id="options"
                  name="options"
                  rows={4}
                  defaultValue={pollContent?.options.join("\n")}
                  placeholder={"Opção 1\nOpção 2"}
                  required
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="text">Texto</Label>
              <Textarea id="text" name="text" rows={5} defaultValue={textDefault} required />
            </div>
          )}

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
