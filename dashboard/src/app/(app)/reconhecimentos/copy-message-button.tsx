"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      {copied ? "Copiado!" : "Copiar mensagem"}
    </Button>
  );
}
