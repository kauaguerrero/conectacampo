"use client";

import { FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { createDocument } from "./actions";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function nameFromFile(file: File): string {
  return file.name.replace(/\.pdf$/i, "");
}

export function UploadDocumentDialog({ trigger }: { trigger: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setEquipment("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. O limite é 15MB.");
      e.target.value = "";
      return;
    }

    setFile(selected);
    if (!name) setName(nameFromFile(selected));
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Escolha um arquivo PDF.");
      return;
    }
    if (!equipment.trim()) {
      toast.error("Informe a qual equipamento esse manual se refere.");
      return;
    }

    setIsUploading(true);

    const supabase = createClient();
    const filePath = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, {
      contentType: "application/pdf",
    });

    if (uploadError) {
      toast.error(`Falha ao enviar o arquivo: ${uploadError.message}`);
      setIsUploading(false);
      return;
    }

    const result = await createDocument(name || nameFromFile(file), equipment, filePath, file.size);
    setIsUploading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Documento enviado.");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Novo documento
          </DialogTitle>
          <DialogDescription>
            Manual técnico (PDF) que a IA vai usar como referência real ao gerar mensagens sobre esse equipamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc_equipment">Equipamento</Label>
            <Input
              id="doc_equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="Ex: Colhedora CH570"
            />
            <p className="text-xs text-muted-foreground">
              Use o mesmo nome do equipamento como aparece nos Temas (ex: &quot;Colhedora CH570&quot;) — é assim que o sistema
              descobre quando anexar esse manual numa geração. Pode listar mais de um separado por vírgula.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="doc_name">Nome do documento</Label>
            <Input
              id="doc_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Manual Colhedora CH570"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Arquivo</Label>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload /> {file ? file.name : "Escolher arquivo .pdf"}
            </Button>
            <p className="text-xs text-muted-foreground">PDF, até 15MB.</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? "Enviando..." : "Enviar documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
