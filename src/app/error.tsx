"use client";

import { WarnIcon } from "@/components/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap" style={{ paddingBlock: "var(--s7)" }}>
      <div className="alert err" role="alert">
        <WarnIcon />
        <div>
          <b>No pudimos cargar esta página</b>
          <p>Revisa tu conexión y vuelve a intentarlo. Si el problema sigue, escríbenos por WhatsApp.</p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={reset}>
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
