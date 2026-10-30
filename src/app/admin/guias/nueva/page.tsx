import type { Metadata } from "next";
import Link from "next/link";
import { NewGuideForm, type DraftPrefill } from "@/components/admin/AdminForms";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCatalog } from "@/lib/admin-catalog";
import { draftsStore } from "@/lib/drafts-store";
import { isoToLocalInput, normalizeGuideCode } from "@/lib/tracking";

export const metadata: Metadata = { title: "Nueva guía" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function NewGuidePage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const now = new Date();
  const sp = await searchParams;
  const code = typeof sp.pedido === "string" ? normalizeGuideCode(sp.pedido) : null;
  const found = code ? await draftsStore()?.get(code) : null;
  const draft: DraftPrefill | undefined =
    found?.status === "pendiente"
      ? { code: found.code, customerName: found.customerName, phone: found.phone, email: found.email, city: found.city, address: found.address, lines: found.lines, shipping: found.zone?.cost ?? 0 }
      : undefined;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="link" href="/admin">
            ← Guías
          </Link>
          <h1 className="disp">{draft ? `Guía del pedido ${draft.code}` : "Nueva guía"}</h1>
        </div>
      </div>
      {draft && (
        <p className="alert ok" role="status">
          <span>
            Datos y productos del pedido de la web{found?.zone ? ` (zona: ${found.zone.name}, ${found.zone.days})` : ""}. Revisa precios y envío con lo acordado por WhatsApp. La guía conservará el código {draft.code}.
            {draft.lines.some((l) => l.unitPrice === 0) && " Hay productos sin precio: escríbelo antes de crear la guía."}
          </span>
        </p>
      )}
      {found && !draft && (
        <p className="alert warn" role="alert">
          <span>
            El pedido {found.code} ya {found.status === "convertido" ? "se convirtió en guía" : "fue descartado"}.{" "}
            {found.guideCode && <Link href={`/admin/guias/${found.guideCode}`}>Abrir la guía</Link>}
          </span>
        </p>
      )}
      <NewGuideForm key={draft?.code ?? "nueva"} catalog={await adminCatalog()} defaultStart={isoToLocalInput(now.toISOString())} nowISO={now.toISOString()} draft={draft} />
    </>
  );
}
