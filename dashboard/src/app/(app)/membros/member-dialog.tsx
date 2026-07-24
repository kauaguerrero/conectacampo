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
import { createMember, updateMember } from "./actions";

interface Group {
  id: string;
  name: string;
  profile: string;
}

interface MemberDialogProps {
  mode: "create" | "edit";
  groups: Group[];
  member?: {
    id: string;
    group_id: string;
    name: string;
    phone: string;
    birthday_date: string | null;
  };
  trigger: React.ReactElement;
}

export function MemberDialog({ mode, groups, member, trigger }: MemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(member?.group_id ?? "");

  const action = async (_prev: { error?: string }, formData: FormData) =>
    mode === "create" ? createMember(formData) : updateMember(member!.id, formData);

  const [state, formAction, isPending] = useActionState(action, {});
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setOpen(false);
      toast.success(mode === "create" ? "Membro cadastrado." : "Membro atualizado.");
    }
    wasPending.current = isPending;
  }, [isPending, state.error, mode]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo membro" : "Editar membro"}</DialogTitle>
          <DialogDescription>Cadastro de operador ou tratorista por grupo.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
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
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={member?.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={member?.phone} placeholder="5511999999999" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="birthday_date">Data de nascimento (opcional)</Label>
            <Input id="birthday_date" name="birthday_date" type="date" defaultValue={member?.birthday_date ?? ""} />
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
