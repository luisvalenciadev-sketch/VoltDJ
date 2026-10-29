"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isThemeId, THEMES, type ThemeId } from "@/config/themes";

const KEY = "voltdj.theme-preview.v1";

/**
 * Vista previa de un tema sin aplicarlo: el panel abre la tienda con ?tema=vitrina y este componente
 * cambia el tema solo en esta pestaña (sessionStorage), también al navegar. Nada se guarda en el
 * servidor ni lo ve otro visitante. ?tema=salir, o el botón, vuelve al tema publicado.
 */
export function ThemePreview({ applied }: { applied: ThemeId }) {
  const pathname = usePathname();
  const [preview, setPreview] = useState<ThemeId | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      const q = new URLSearchParams(location.search).get("tema");
      if (q === "salir") sessionStorage.removeItem(KEY);
      else if (isThemeId(q)) sessionStorage.setItem(KEY, q);
      stored = sessionStorage.getItem(KEY);
    } catch {}
    const next = isThemeId(stored) && stored !== applied ? stored : null;
    document.documentElement.dataset.theme = next ?? applied;
    setPreview(next);
  }, [pathname, applied]);

  if (!preview) return null;
  const exit = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    document.documentElement.dataset.theme = applied;
    setPreview(null);
  };
  return (
    <div className="theme-preview" role="status">
      <span>
        Vista previa: tema <b>{THEMES[preview].name}</b>. Solo la ves tú.
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={exit}>
        Salir
      </button>
    </div>
  );
}
