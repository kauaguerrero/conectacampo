"use client";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importMembers, parseMembersFile, type ParsedMemberRow } from "./actions";

const STATUS_LABEL: Record<ParsedMemberRow["status"], string> = {
  ok: "Pronto pra importar",
  duplicado: "Duplicado",
  sem_grupo: "Sem grupo",
  invalido: "Inválido",
};

const EXAMPLE_ROWS = [
  { phone: "5511999990001", name: "João da Silva", birthday: "15/03/1990" },
  { phone: "5511999990002", name: "Maria Oliveira", birthday: "02/11/1985" },
  { phone: "5511999990003", name: "Pedro Souza", birthday: "" },
];

export function ImportMembersDialog({ trigger }: { trigger: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rows, setRows] = useState<ParsedMemberRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1);
    setRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await parseMembersFile(formData);
    setIsParsing(false);

    if ("error" in result) {
      toast.error(result.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (result.rows.length === 0) {
      toast.error("Nenhuma linha de membro encontrada abaixo do cabeçalho.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setRows(result.rows);
    setStep(2);
  }

  async function handleConfirm() {
    setIsImporting(true);
    const result = await importMembers(rows);
    setIsImporting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(`${result.inserted} de ${result.total} membro(s) importado(s) com sucesso.`);
    setOpen(false);
    reset();
    router.refresh();
  }

  const okCount = rows.filter((r) => r.status === "ok").length;
  const duplicadoCount = rows.filter((r) => r.status === "duplicado").length;
  const semGrupoCount = rows.filter((r) => r.status === "sem_grupo").length;
  const invalidoCount = rows.filter((r) => r.status === "invalido").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-[#1D6F42]" />
            Importar membros por planilha Excel
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Passo 1 de 2 — como montar a planilha"
              : `Passo 2 de 2 — confira os ${rows.length} membro(s) encontrados antes de confirmar`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Crie uma planilha Excel (.xlsx) com uma linha de cabeçalho e uma linha por membro, com estas colunas:
            </p>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/80">
                    <th className="w-8 border-r border-b px-2 py-1.5 text-center text-xs font-normal text-muted-foreground">
                      {" "}
                    </th>
                    <th className="border-r border-b px-3 py-1.5 text-left font-semibold">A · Telefone</th>
                    <th className="border-r border-b px-3 py-1.5 text-left font-semibold">B · Nome</th>
                    <th className="border-b px-3 py-1.5 text-left font-semibold">C · Data de nascimento</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_ROWS.map((row, i) => (
                    <tr key={row.phone} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <td className="border-r px-2 py-1.5 text-center text-xs text-muted-foreground">{i + 1}</td>
                      <td className="border-r px-3 py-1.5 font-mono text-xs">{row.phone}</td>
                      <td className="border-r px-3 py-1.5">{row.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{row.birthday || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>
                • <span className="font-medium text-foreground">Telefone</span>: com DDI e DDD, só números (ex:
                5511999990001)
              </li>
              <li>
                • <span className="font-medium text-foreground">Nome</span>: nome completo do membro
              </li>
              <li>
                • <span className="font-medium text-foreground">Data de nascimento</span>: opcional, no formato
                dd/mm/aaaa
              </li>
            </ul>

            <p className="rounded-xl bg-muted/60 p-3 text-sm">
              Não precisa de coluna de grupo — o sistema descobre sozinho o grupo de cada membro (Operadores ou
              Tratoristas) checando em qual grupo do WhatsApp aquele número já está.
            </p>

            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                <Upload /> {isParsing ? "Lendo planilha..." : "Escolher arquivo .xlsx"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-chart-1/20 text-chart-1">{okCount} prontos</Badge>
              {duplicadoCount > 0 ? <Badge variant="outline">{duplicadoCount} duplicados</Badge> : null}
              {semGrupoCount > 0 ? <Badge variant="destructive">{semGrupoCount} sem grupo</Badge> : null}
              {invalidoCount > 0 ? <Badge variant="destructive">{invalidoCount} inválidos</Badge> : null}
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{row.groupName ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5" title={row.issue}>
                          {row.status === "ok" ? (
                            <CheckCircle2 className="size-4 text-chart-1" />
                          ) : row.status === "duplicado" ? (
                            <AlertTriangle className="size-4 text-muted-foreground" />
                          ) : (
                            <XCircle className="size-4 text-destructive" />
                          )}
                          <span className="text-xs text-muted-foreground">{STATUS_LABEL[row.status]}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)} disabled={isImporting}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={isImporting || okCount === 0}>
                {isImporting ? "Importando..." : `Importar ${okCount} membro(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
