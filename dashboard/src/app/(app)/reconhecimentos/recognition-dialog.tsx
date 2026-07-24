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
import { createRecognition, updateRecognition, type RecognitionType } from "./actions";

interface Group {
  id: string;
  name: string;
  profile: string;
}

interface Member {
  id: string;
  group_id: string;
  name: string;
}

const TYPE_LABELS: Record<RecognitionType, string> = {
  aniversario: "Aniversário",
  destaque: "Destaque",
  marco_seguranca: "Marco de segurança",
};

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

interface RecognitionDialogProps {
  mode?: "create" | "edit";
  groups: Group[];
  members: Member[];
  recognition?: {
    id: string;
    group_id: string;
    member_id: string;
    type: RecognitionType;
    note: string | null;
    scheduled_for: string;
  };
  trigger: React.ReactElement;
}

export function RecognitionDialog({ mode = "create", groups, members, recognition, trigger }: RecognitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(recognition?.group_id ?? "");
  const [memberId, setMemberId] = useState(recognition?.member_id ?? "");
  const [type, setType] = useState<RecognitionType>(recognition?.type ?? "aniversario");

  const action = async (_prev: { error?: string }, formData: FormData) =>
    mode === "create" ? createRecognition(formData) : updateRecognition(recognition!.id, formData);

  const [state, formAction, isPending] = useActionState(action, {});
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setOpen(false);
      if (mode === "create") {
        setGroupId("");
        setMemberId("");
      }
      toast.success(mode === "create" ? "Reconhecimento cadastrado." : "Reconhecimento atualizado.");
    }
    wasPending.current = isPending;
  }, [isPending, state.error, mode]);

  const membersInGroup = members.filter((m) => m.group_id === groupId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo reconhecimento" : "Editar reconhecimento"}</DialogTitle>
          <DialogDescription>Aniversário, destaque ou marco de segurança, com data de envio.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="group_id">Grupo</Label>
            <Select
              value={groupId}
              onValueChange={(value) => {
                setGroupId(value ?? "");
                setMemberId("");
              }}
            >
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
            <Label htmlFor="member_id">Membro</Label>
            <Select value={memberId} onValueChange={(value) => setMemberId(value ?? "")}>
              <SelectTrigger id="member_id" className="w-full" disabled={!groupId}>
                <SelectValue placeholder={groupId ? "Escolha o membro" : "Escolha o grupo primeiro"}>
                  {(value: string | null) =>
                    membersInGroup.find((m) => m.id === value)?.name ??
                    (groupId ? "Escolha o membro" : "Escolha o grupo primeiro")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {membersInGroup.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="member_id" value={memberId} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as RecognitionType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue>{(value: RecognitionType | null) => (value ? TYPE_LABELS[value] : "")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as RecognitionType[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="type" value={type} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Textarea id="note" name="note" rows={3} defaultValue={recognition?.note ?? ""} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduled_for">Data de envio</Label>
            <Input
              id="scheduled_for"
              name="scheduled_for"
              type="datetime-local"
              defaultValue={recognition ? toLocalInputValue(recognition.scheduled_for) : undefined}
              required
            />
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
