const IMAGE_POSITION = "center 65%";

export function DashboardHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[-20px_10px_36px_-18px_rgb(0_0_0_/_0.45)]">
      {/* Camada nítida (base) */}
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: "url('/headerimage.png')", backgroundPosition: IMAGE_POSITION }}
      />
      {/* Camada borrada, forte à esquerda e some pra direita (mask-image) —
          dá legibilidade pro texto sem esconder a foto por completo. */}
      <div
        className="absolute inset-0 scale-110 bg-cover"
        style={{
          backgroundImage: "url('/headerimage.png')",
          backgroundPosition: IMAGE_POSITION,
          filter: "blur(22px)",
          maskImage: "linear-gradient(to right, black 0%, black 35%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to right, black 0%, black 35%, transparent 78%)",
        }}
      />
      {/* Escurecimento pra contraste do texto, também mais forte à esquerda */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />

      <div className="relative z-10 flex min-h-[9.5rem] flex-col justify-center gap-1.5 px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">{title}</h1>
        <p className="text-sm text-white/85 drop-shadow-sm sm:text-base">{subtitle}</p>
      </div>
    </div>
  );
}
