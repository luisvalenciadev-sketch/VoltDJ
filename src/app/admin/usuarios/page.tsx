import type { Metadata } from "next";
import { CreateUserForm, UserEditor } from "@/components/admin/UserForms";
import { requireOwner } from "@/lib/admin-auth";
import { ROLE_LABEL } from "@/lib/permissions";
import { formatTrackingDate } from "@/lib/tracking";
import { usersStore } from "@/lib/users-store";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ primero?: string }> }) {
  const session = await requireOwner();
  const store = usersStore();
  const users = await store.list();
  const firstOwner = !session.userId && !users.some((u) => u.role === "dueno" && u.active);
  const first = (await searchParams).primero;
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Equipo</span>
          <h1 className="disp">Usuarios</h1>
          <p className="note">Cada persona entra con su correo. El dueño ve todo; el asesor atiende pedidos, guías e inventario, sin cambiar precios, marca, contenido ni usuarios.</p>
        </div>
      </div>

      {!store.writable && (
        <p className="alert warn">
          <span>Falta conectar la base de datos (Neon): sin ella no se pueden crear usuarios y el panel sigue con la contraseña única.</span>
        </p>
      )}
      {first && (
        <p className="alert ok" role="status">
          <span>Listo: ya eres el dueño. Desde ahora se entra con correo y contraseña, y la contraseña única dejó de funcionar.</span>
        </p>
      )}

      {firstOwner ? (
        <section className="panel" aria-labelledby="h-first">
          <h2 id="h-first">Crea tu usuario de dueño</h2>
          <p className="note">Hoy el panel se abre con una contraseña única que cualquiera que la conozca puede usar. Al crear tu usuario, esa contraseña deja de servir y cada persona entra con su correo; tú sigues adentro.</p>
          <CreateUserForm firstOwner writable={store.writable} />
        </section>
      ) : (
        <>
          <ul className="editor-list">
            {users.map((u) => (
              <li key={u.id}>
                <details className="editor">
                  <summary>
                    <span className="ed-text">
                      <b>
                        {u.name}
                        {u.id === session.userId && " (tú)"}
                      </b>
                      <span className="note">
                        {u.email} · {u.lastLoginAt ? `último ingreso ${formatTrackingDate(u.lastLoginAt)}` : "aún no ha entrado"}
                      </span>
                    </span>
                    <span className="status-chip" data-s={u.active ? (u.role === "dueno" ? "vigente" : "programada") : "pausada"}>
                      {u.active ? ROLE_LABEL[u.role] : "Desactivado"}
                    </span>
                  </summary>
                  <UserEditor user={{ id: u.id, name: u.name, role: u.role, active: u.active }} self={u.id === session.userId} writable={store.writable} />
                </details>
              </li>
            ))}
            <li>
              <details className="editor">
                <summary>
                  <span className="ed-add">+ Nuevo usuario</span>
                </summary>
                <CreateUserForm firstOwner={false} writable={store.writable} />
              </details>
            </li>
          </ul>
        </>
      )}
    </>
  );
}
