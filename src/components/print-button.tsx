"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Bouton d'impression ; ouvre la boîte « Enregistrer en PDF » automatiquement si demandé. */
export function PrintButton({ auto }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [auto]);
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" /> Imprimer / PDF
    </Button>
  );
}
