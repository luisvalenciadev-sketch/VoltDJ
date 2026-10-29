import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/ui";
import { normalizeGuideCode } from "@/lib/tracking";

export const metadata: Metadata = {
  title: "Rastrear pedido",
  description: "Consulta el estado de tu pedido con el código de guía que te envió el asesor por WhatsApp.",
  alternates: { canonical: "/seguimiento" },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function TrackingSearchPage({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams).codigo;
  const input = typeof raw === "string" ? raw : "";
  const code = input ? normalizeGuideCode(input) : null;
  if (code) redirect(`/seguimiento/${code}`);

  return (
    <div className="wrap track">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Rastrear pedido" }]} />
      <div className="pagehead">
        <span className="eyebrow">Seguimiento</span>
        <h1 className="disp">Rastrea tu pedido</h1>
        <p>Escribe el código de guía que te enviamos por WhatsApp. Tiene la forma VD-XXXX-XXXX.</p>
      </div>
      {/* GET simple: funciona sin JavaScript y deja la consulta en la URL. */}
      <form className="track-form" action="/seguimiento" method="get" role="search">
        <label className="sr-only" htmlFor="codigo">
          Código de guía
        </label>
        <input
          id="codigo"
          name="codigo"
          className="input"
          placeholder="VD-7K4M-Q2X9"
          defaultValue={input}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          required
          aria-invalid={input && !code ? true : undefined}
          aria-describedby={input && !code ? "codigo-err" : undefined}
        />
        <button type="submit" className="btn btn-primary">
          Rastrear
        </button>
      </form>
      {input && !code && (
        <p id="codigo-err" className="alert err" role="alert">
          <span>Ese código no tiene el formato correcto. Revisa que tenga 8 letras y números después de “VD-”.</span>
        </p>
      )}
    </div>
  );
}
