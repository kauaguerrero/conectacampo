import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { ActiveToggle } from "./active-toggle";
import { DeleteMemberButton } from "./delete-member-button";
import { MemberDialog } from "./member-dialog";

interface MemberRow {
  id: string;
  group_id: string;
  name: string;
  phone: string;
  birthday_date: string | null;
  active: boolean;
  groups: { name: string } | null;
}

const AVATAR_TONES = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/20 text-[oklch(0.5_0.12_80)] dark:text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function MembrosPage() {
  const supabase = await createClient();

  const [{ data: groups }, { data: members, error }] = await Promise.all([
    supabase.from("groups").select("id, name, profile").order("name"),
    supabase
      .from("members")
      .select("id, group_id, name, phone, birthday_date, active, groups(name)")
      .order("name"),
  ]);

  const rows = (members as MemberRow[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Membros"
        subtitle="Cadastro de operadores e tratoristas por grupo."
        action={
          <MemberDialog
            mode="create"
            groups={groups ?? []}
            trigger={
              <Button disabled={!groups || groups.length === 0}>
                <Plus /> Novo membro
              </Button>
            }
          />
        }
      />

      {!groups || groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo cadastrado ainda. Cadastre um grupo direto no banco antes de adicionar membros.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">Erro ao carregar membros: {error.message}</p> : null}

      <Card>
        <CardContent className="pt-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Nascimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member, index) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
                      >
                        {initials(member.name)}
                      </span>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.groups?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{member.phone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.birthday_date
                      ? new Date(member.birthday_date + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ActiveToggle id={member.id} active={member.active} />
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <MemberDialog
                      mode="edit"
                      groups={groups ?? []}
                      member={member}
                      trigger={
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <DeleteMemberButton id={member.id} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum membro cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
