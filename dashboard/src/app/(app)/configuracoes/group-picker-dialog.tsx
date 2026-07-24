"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listWhatsAppGroups, selectGroupForProfile, type GroupProfile, type WhatsAppGroup } from "./whatsapp-actions";

const PAGE_SIZE = 50;

export function GroupPickerDialog({
  profile,
  profileLabel,
  trigger,
  onSelected,
}: {
  profile: GroupProfile;
  profileLabel: string;
  trigger: React.ReactElement;
  onSelected: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listWhatsAppGroups().then((result) => {
      if ("error" in result) {
        setError(result.error);
      } else {
        setGroups(result.groups);
      }
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())),
    [groups, query],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function handleSelect(group: WhatsAppGroup) {
    setSelectingId(group.id);
    const result = await selectGroupForProfile(profile, group.id, group.name);
    setSelectingId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Grupo ${profileLabel} definido: ${group.name}`);
    setOpen(false);
    onSelected();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolher grupo — {profileLabel}</DialogTitle>
          <DialogDescription>Grupos do WhatsApp conectado no momento.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar grupo pelo nome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : (
            <>
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {pageItems.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelect(group)}
                    disabled={selectingId !== null}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/70 disabled:opacity-50"
                  >
                    <span className="truncate font-medium">{group.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {selectingId === group.id ? "Salvando..." : `${group.participants} membros`}
                    </span>
                  </button>
                ))}
                {pageItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum grupo encontrado.</p>
                ) : null}
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between text-sm">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </Button>
                  <span className="text-muted-foreground">
                    Página {page + 1} de {totalPages} · {filtered.length} grupos
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">{filtered.length} grupos</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
