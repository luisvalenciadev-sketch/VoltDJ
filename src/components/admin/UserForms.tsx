"use client";

import { useActionState } from "react";
import { changeOwnPassword, createUser, logoutEverywhere, resetPassword, undoChange, updateUser } from "@/app/admin/usuarios/actions";
import { ROLE_HINT, ROLE_LABEL, type Role } from "@/lib/permissions";
import { Message } from "./CatalogForms";

function RolePicker({ name, value, uid }: { name: string; value?: Role; uid: string }) {
  return (
    <fieldset className="field span-2 pick-row">
      <legend className="label">Rol</legend>
      <div className="mode-cards">
        {(["asesor", "dueno"] as Role[]).map((r) => (
          <label key={r} className="mode-card">
            <input type="radio" name={name} value={r} defaultChecked={(value ?? "asesor") === r} required id={`${uid}-${r}`} />
            <b>{ROLE_LABEL[r]}</b>
            <span>{ROLE_HINT[r]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateUserForm({ firstOwner, writable }: { firstOwner: boolean; writable: boolean }) {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className="stack">
      <div className="admin-grid">
        <div className="field">
          <label htmlFor="u-name">Nombre</label>
          <input id="u-name" name="name" className="input" maxLength={60} required />
        </div>
        <div className="field">
          <label htmlFor="u-email">Correo</label>
          <input id="u-email" name="email" type="email" className="input" maxLength={160} required autoComplete="off" />
        </div>
        <div className="field span-2">
          <label htmlFor="u-pass">Contraseña inicial</label>
          <input id="u-pass" name="password" type="password" className="input" minLength={10} required autoComplete="new-password" />
          <span className="note">Mínimo 10 caracteres. La persona puede cambiarla después en Mi cuenta.</span>
        </div>
        {firstOwner ? <input type="hidden" name="role" value="dueno" /> : <RolePicker name="role" uid="u-new" />}
      </div>
      <div className="row-wrap">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !writable}>
          {pending ? "Creando…" : firstOwner ? "Crear mi usuario de dueño" : "Crear usuario"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function UserEditor({ user, self, writable }: { user: { id: string; name: string; role: Role; active: boolean }; self: boolean; writable: boolean }) {
  const [state, action, pending] = useActionState(updateUser.bind(null, user.id), undefined);
  const [pState, pAction, pPending] = useActionState(resetPassword.bind(null, user.id), undefined);
  return (
    <div className="stack">
      <form action={action} className="stack">
        <div className="admin-grid">
          <div className="field span-2">
            <label htmlFor={`n-${user.id}`}>Nombre</label>
            <input id={`n-${user.id}`} name="name" className="input" maxLength={60} defaultValue={user.name} required />
          </div>
          <RolePicker name="role" value={user.role} uid={`u-${user.id}`} />
          <label className="step-toggle span-2">
            <input type="checkbox" name="active" defaultChecked={user.active} disabled={self} />
            Activo (desactivado no puede entrar; su historial se conserva)
          </label>
          {/* Una casilla deshabilitada no se envía: el dueño no puede desactivarse a sí mismo. */}
          {self && <input type="hidden" name="active" value="on" />}
        </div>
        <div className="row-wrap">
          <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !writable}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
        <Message state={state} />
      </form>
      <form action={pAction} className="stack">
        <div className="field">
          <label htmlFor={`p-${user.id}`}>Nueva contraseña</label>
          <div className="with-action">
            <input id={`p-${user.id}`} name="password" type="password" className="input" minLength={10} required autoComplete="new-password" />
            <button type="submit" className="btn btn-ghost btn-sm" disabled={pPending || !writable}>
              {pPending ? "…" : "Cambiar contraseña"}
            </button>
          </div>
          <span className="note">Cierra las sesiones abiertas de este usuario.</span>
        </div>
        <Message state={pState} />
      </form>
    </div>
  );
}

export function OwnPasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, undefined);
  return (
    <form action={action} className="stack" style={{ maxWidth: 420 }}>
      <div className="field">
        <label htmlFor="cur">Contraseña actual</label>
        <input id="cur" name="current" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="new">Nueva contraseña</label>
        <input id="new" name="password" type="password" className="input" minLength={10} required autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="conf">Repite la nueva contraseña</label>
        <input id="conf" name="confirm" type="password" className="input" minLength={10} required autoComplete="new-password" />
      </div>
      <Message state={state} />
      <div className="row-wrap">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}

export function LogoutEverywhereButton() {
  return (
    <form action={logoutEverywhere}>
      <button type="submit" className="btn btn-ghost btn-sm">
        Cerrar sesión en todos los dispositivos
      </button>
    </form>
  );
}

export function UndoButton({ id, label }: { id: string; label: string }) {
  const [state, run, pending] = useActionState(async () => undoChange(id), undefined);
  return (
    <form action={run} className="undo">
      <button type="submit" className="textbtn" disabled={pending} aria-label={`Deshacer: ${label}`}>
        {pending ? "…" : "Deshacer"}
      </button>
      {state?.error && <span className="note warn-text">{state.error}</span>}
      {state?.ok && <span className="note">{state.ok}</span>}
    </form>
  );
}
