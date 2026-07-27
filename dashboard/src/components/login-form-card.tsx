"use client";

import { motion } from "framer-motion";
import { LogIn, Lock, Mail, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginFormCard({
  error,
  action,
}: {
  error?: string;
  action: (formData: FormData) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="w-full max-w-sm"
    >
      <Card className="gap-6 rounded-3xl p-2 shadow-[0_24px_48px_-24px_oklch(0.24_0.05_150_/_0.35)] ring-1 ring-foreground/8">
        <CardHeader className="items-center gap-3 pt-4 text-center">
          <Image
            src="/cclogoescrito-icon.png"
            alt="Conecta Campo"
            width={220}
            height={146}
            priority
            className="h-auto w-36"
          />
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
          <div>
            <p className="text-lg font-semibold tracking-tight">Entrar no painel</p>
            <p className="text-sm text-muted-foreground">Alta Mogiana — painel do instrutor</p>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <form action={action} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>
            {error ? (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            <Button type="submit" size="lg" className="h-10 w-full gap-2 rounded-xl">
              Entrar
              <LogIn className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
