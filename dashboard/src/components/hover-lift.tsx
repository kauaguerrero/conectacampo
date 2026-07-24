"use client";

import { motion } from "framer-motion";

// Só o efeito de hover isolado num Client Component — recebe `children` já
// renderizado (serializável), nunca referências de componente (ex: ícones),
// que quebram a fronteira Server → Client Component do Next.js.
export function HoverLift({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 12px 24px -8px oklch(0.24 0.05 150 / 0.18)" }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
