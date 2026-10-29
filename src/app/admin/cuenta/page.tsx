import type { Metadata } from "next";
import Link from "next/link";
import { LogoutEverywhereButton, OwnPasswordForm } from "@/components/admin/UserForms";
import { requireAdmin } from "@/lib/admin-auth";
import { ROLE_HINT, ROLE_LABEL } from "@/lib/permissions";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const session = await requireAdmin();
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Mi cuenta</span>
          <h1 className="disp">{session.name}</h1>
          <p className="note">
            {ROLE_LABEL[session.role]}: {ROLE_HINT[session.role]}
          </p>
        </div>
      </div>
      {session.userId ? (
        <section className="panel" aria-labelledby="h-pass">
          <h2 id="h-pass">Cambiar contraseña</h2>
          <OwnPasswordForm />
          <LogoutEverywhereButton />
        </section>
      ) : (
        <p className="alert warn">
          <span>
            Entraste con la contraseña única. <Link href="/admin/usuarios">Crea tu usuario de dueño</Link> para entrar con tu correo.
          </span>
        </p>
      )}
    </>
  );
}
