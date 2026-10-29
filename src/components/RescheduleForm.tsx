"use client";

import { useActionState } from "react";
import { rescheduleDelivery } from "@/app/seguimiento/actions";

/** Formulario del cliente para elegir una nueva fecha tras una entrega fallida. */
export function RescheduleForm({ code, minDay, maxDay }: { code: string; minDay: string; maxDay: string }) {
  const [state, action, pending] = useActionState(rescheduleDelivery.bind(null, code), undefined);
  if (state?.ok) {
    return (
      <p className="alert ok" role="status">
        <span>{state.ok}</span>
      </p>
    );
  }
  return (
    <form action={action} className="reschedule">
      <div>
        <b>Reprograma tu entrega</b>
        <p className="note">Elige el día en que puedes recibir. La transportadora intentará de nuevo en esa fecha.</p>
      </div>
      <div className="rs-fields">
        <div className="field">
          <label htmlFor="rs-day">Nueva fecha</label>
          <input id="rs-day" name="day" type="date" className="input" min={minDay} max={maxDay} defaultValue={minDay} required />
        </div>
        <div className="field">
          <label htmlFor="rs-slot">Horario</label>
          <select id="rs-slot" name="slot" className="input" defaultValue="cualquiera">
            <option value="cualquiera">Cualquier hora</option>
            <option value="manana">En la mañana</option>
            <option value="tarde">En la tarde</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Reprogramando…" : "Reprogramar entrega"}
        </button>
      </div>
      {state?.error && (
        <p className="alert err" role="alert">
          <span>{state.error}</span>
        </p>
      )}
    </form>
  );
}
