import { Sparkles, Trophy, Vote } from "lucide-react";
import { LoginFormCard } from "@/components/login-form-card";
import { login } from "./actions";

const FEATURES = [
  { icon: Sparkles, label: "Conteúdo gerado por IA" },
  { icon: Vote, label: "Enquetes automáticas" },
  { icon: Trophy, label: "Reconhecimento da equipe" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative isolate flex h-56 flex-col justify-end overflow-hidden p-8 sm:h-72 lg:h-auto lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 -z-10 bg-cover"
          style={{ backgroundImage: "url('/headerimage.png')", backgroundPosition: "center 65%" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.22_0.045_150/_0.92)] via-[oklch(0.24_0.05_150/_0.55)] to-[oklch(0.3_0.06_150/_0.15)] lg:bg-gradient-to-r lg:from-[oklch(0.22_0.045_150/_0.9)] lg:via-[oklch(0.24_0.05_150/_0.45)] lg:to-transparent" />

        <span className="hidden text-lg font-bold tracking-tight text-white drop-shadow-sm lg:inline">
          Conecta Campo
        </span>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
              Comunidade WhatsApp da Alta Mogiana
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-white/85 drop-shadow-sm sm:text-base">
              Conteúdo, enquetes e reconhecimento pra equipe de campo — tudo em um só lugar.
            </p>
          </div>
          <div className="hidden flex-wrap gap-2 sm:flex">
            {FEATURES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-sm"
              >
                <Icon className="size-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <LoginFormCard error={error} action={login} />
      </div>
    </div>
  );
}
