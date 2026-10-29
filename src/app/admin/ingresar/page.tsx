import type { Metadata } from "next";
import { connection } from "next/server";
import { LoginForm } from "@/components/admin/AdminForms";
import { adminConfigured } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function AdminLoginPage() {
  // Se evalúa en cada visita: si la página quedara prerenderizada, mostraría "sin configurar"
  // hasta el siguiente build aunque las variables ya existan.
  await connection();
  return (
    <div className="admin-login">
      <span className="eyebrow">Panel de la tienda</span>
      <h1 className="disp">Guías de pedidos</h1>
      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <div className="alert warn">
          <div>
            <b>El panel aún no está configurado</b>
            <p>
              En Vercel → Settings → Environment Variables agrega <code>ADMIN_PASSWORD</code> (mínimo 10 caracteres) y <code>SESSION_SECRET</code> (32 caracteres o más) y vuelve a desplegar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
