"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSend } from "./actions";

interface Group {
  id: string;
  name: string;
  profile: string;
}

interface TemplateOption {
  id: string;
  name: string;
  type: string;
  content: { text?: string; question?: string; options?: string[] };
}

export function SendForm({ groups, templates }: { groups: Group[]; templates: TemplateOption[] }) {
  const [mode, setMode] = useState<"template" | "texto" | "enquete">("texto");
  const [templateId, setTemplateId] = useState<string>("");
  const [when, setWhen] = useState<"now" | "agendado">("now");
  const [groupId, setGroupId] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createSend(formData),
    {},
  );
  const wasPending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      toast.success("Envio criado.");
      formRef.current?.reset();
      setTemplateId("");
      setGroupId("");
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-2">
        <Label htmlFor="group_id">Grupo</Label>
        <Select value={groupId} onValueChange={(value) => setGroupId(value ?? "")}>
          <SelectTrigger id="group_id" className="w-full">
            <SelectValue placeholder="Escolha o grupo">
              {(value: string | null) => {
                const group = groups.find((g) => g.id === value);
                return group ? `${group.name} (${group.profile})` : "Escolha o grupo";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name} ({group.profile})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="group_id" value={groupId} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Conteúdo</Label>
        <div className="flex gap-2">
          <Button type="button" variant={mode === "texto" ? "default" : "outline"} size="sm" onClick={() => setMode("texto")}>
            Texto livre
          </Button>
          <Button type="button" variant={mode === "template" ? "default" : "outline"} size="sm" onClick={() => setMode("template")}>
            Usar template
          </Button>
          <Button type="button" variant={mode === "enquete" ? "default" : "outline"} size="sm" onClick={() => setMode("enquete")}>
            Enquete
          </Button>
        </div>
        <input type="hidden" name="mode" value={mode} />
      </div>

      {mode === "texto" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="text">Mensagem</Label>
          <Textarea id="text" name="text" rows={5} placeholder="Escreva a mensagem..." />
        </div>
      ) : null}

      {mode === "template" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="template_id">Template</Label>
          <Select value={templateId} onValueChange={(value) => setTemplateId(value ?? "")}>
            <SelectTrigger id="template_id" className="w-full">
              <SelectValue placeholder="Escolha um template">
                {(value: string | null) => templates.find((t) => t.id === value)?.name ?? "Escolha um template"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="template_id" value={templateId} />
          {selectedTemplate ? (
            <div className="rounded-md border bg-muted/50 p-2 text-sm text-muted-foreground">
              {selectedTemplate.type === "enquete" ? (
                <>
                  <p className="font-medium text-foreground">{selectedTemplate.content.question}</p>
                  <ul className="mt-1 list-inside list-disc">
                    {selectedTemplate.content.options?.map((option) => <li key={option}>{option}</li>)}
                  </ul>
                </>
              ) : (
                <p className="whitespace-pre-wrap">{selectedTemplate.content.text}</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "enquete" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="question">Pergunta</Label>
            <Input id="question" name="question" placeholder="Ex: Qual tema você quer ver essa semana?" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="options">Opções (uma por linha, mínimo 2)</Label>
            <Textarea id="options" name="options" rows={4} placeholder={"Opção 1\nOpção 2"} />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>Quando enviar</Label>
        <div className="flex gap-2">
          <Button type="button" variant={when === "now" ? "default" : "outline"} size="sm" onClick={() => setWhen("now")}>
            Enviar agora
          </Button>
          <Button type="button" variant={when === "agendado" ? "default" : "outline"} size="sm" onClick={() => setWhen("agendado")}>
            Agendar
          </Button>
        </div>
        <input type="hidden" name="when" value={when} />
      </div>

      {when === "agendado" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="scheduled_for">Data/hora</Label>
          <Input id="scheduled_for" name="scheduled_for" type="datetime-local" />
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Enviando..." : when === "now" ? "Enviar agora" : "Agendar envio"}
      </Button>
    </form>
  );
}
