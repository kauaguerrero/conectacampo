"use client";

import { CheckCircle2, Smartphone, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { connectWhatsApp, getWhatsAppStatus, logoutWhatsApp, type WhatsAppStatus } from "./whatsapp-actions";

const POLL_MS = 3000;

function formatUserLabel(user: WhatsAppStatus["user"]): string {
  if (!user) return "—";
  const digits = user.id.split("@")[0].split(":")[0];
  return user.name ? `${user.name} (${digits})` : digits;
}

export function WhatsAppConnectionCard({ initialStatus }: { initialStatus: WhatsAppStatus | { error: string } }) {
  const [status, setStatus] = useState<WhatsAppStatus | { error: string }>(initialStatus);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const result = await getWhatsAppStatus();
      setStatus(result);
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleConnect() {
    setIsConnecting(true);
    const result = await connectWhatsApp();
    if (result.error) toast.error(result.error);
    const fresh = await getWhatsAppStatus();
    setStatus(fresh);
    setIsConnecting(false);
  }

  async function handleLogout() {
    if (!confirmingLogout) {
      setConfirmingLogout(true);
      return;
    }
    setIsLoggingOut(true);
    const result = await logoutWhatsApp();
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Sessão do WhatsApp desconectada.");
    }
    const fresh = await getWhatsAppStatus();
    setStatus(fresh);
    setConfirmingLogout(false);
    setIsLoggingOut(false);
  }

  const hasError = "error" in status;
  const isOpen = !hasError && status.status === "open" && status.user;
  const isWaitingScan = !hasError && !isOpen && status.qrImage;
  const isPreparingQr =
    !hasError && !isOpen && !isWaitingScan && (isConnecting || status.status === "connecting");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${
              isOpen ? "bg-chart-1/15 text-chart-1" : "bg-destructive/12 text-destructive"
            }`}
          >
            {isOpen ? <CheckCircle2 className="size-4" /> : <WifiOff className="size-4" />}
          </span>
          <div>
            <CardTitle>Conexão com o WhatsApp</CardTitle>
            <CardDescription>Sessão que o worker usa pra enviar e ler mensagens dos grupos.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasError ? (
          <p className="text-sm text-destructive">{status.error}</p>
        ) : isOpen ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-chart-1/20 text-chart-1">Logado</Badge>
              <span className="flex items-center gap-1.5 text-sm">
                <Smartphone className="size-4 text-muted-foreground" />
                {formatUserLabel(status.user)}
              </span>
            </div>
            <Button
              variant={confirmingLogout ? "destructive" : "outline"}
              size="sm"
              onClick={handleLogout}
              onBlur={() => setConfirmingLogout(false)}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Deslogando..." : confirmingLogout ? "Confirmar desconexão?" : "Deslogar"}
            </Button>
          </div>
        ) : isWaitingScan ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/60 p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada pelo worker, não é um asset estático */}
            <img src={status.qrImage ?? undefined} alt="QR code para conectar o WhatsApp" className="size-48 rounded-lg bg-white p-2" />
            <p className="text-sm text-muted-foreground">
              Abra o WhatsApp no celular → <span className="font-medium text-foreground">Aparelhos conectados</span>{" "}
              → <span className="font-medium text-foreground">Conectar um aparelho</span>, e escaneie o código.
            </p>
          </div>
        ) : isPreparingQr ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/60 p-4 text-center">
            <Skeleton className="size-48 rounded-lg" />
            <Skeleton className="h-3 w-56" />
            <p className="text-sm text-muted-foreground">
              {!hasError && status.hadQr
                ? "QR code escaneado! Finalizando a conexão..."
                : "Gerando QR code, só um instante..."}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="destructive">Desconectado</Badge>
            <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Conectando..." : "Conectar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
