import type { Metadata } from "next";
import Link from "next/link";
import { NewGuideForm } from "@/components/admin/AdminForms";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCatalog } from "@/lib/admin-catalog";
import { isoToLocalInput } from "@/lib/tracking";

export const metadata: Metadata = { title: "Nueva guía" };

export default async function NewGuidePage() {
  await requireAdmin();
  const now = new Date();
  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="link" href="/admin">
            ← Guías
          </Link>
          <h1 className="disp">Nueva guía</h1>
        </div>
      </div>
      <NewGuideForm catalog={await adminCatalog()} defaultStart={isoToLocalInput(now.toISOString())} nowISO={now.toISOString()} />
    </>
  );
}
