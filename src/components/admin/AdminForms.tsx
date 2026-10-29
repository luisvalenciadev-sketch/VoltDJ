"use client";

import { useActionState, useState } from "react";
import { createGuide, deleteGuide, login, saveSchedule, setManualStatus, updateDetails, type FormState } from "@/app/admin/actions";
import { DEFAULT_OFFSETS, isoToLocalInput, STATUS_LABEL, STEPS, type Guide, type StatusId, type TrackingEvent } from "@/lib/tracking";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p className={`alert ${state.error ? "err" : "ok"}`} role={state.error ? "alert" : "status"}>
      <span>{state.error ?? state.ok}</span>
    </p>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="password">Contraseña del panel</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus />
      </div>
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Verificando…" : "Ingresar"}
      </button>
    </form>
  );
}

function DetailsFields({ guide }: { guide?: Guide }) {
  return (
    <div className="admin-grid">
      <div className="field">
        <label htmlFor="customerName">Nombre del cliente *</label>
        <input id="customerName" name="customerName" className="input" required maxLength={80} defaultValue={guide?.customerName} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="phone">Celular (WhatsApp)</label>
        <input id="phone" name="phone" className="input" inputMode="tel" maxLength={25} placeholder="3001234567" defaultValue={guide?.phone ?? ""} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="city">Ciudad</label>
        <input id="city" name="city" className="input" maxLength={60} defaultValue={guide?.city ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="carrier">Transportadora</label>
        <input id="carrier" name="carrier" className="input" maxLength={40} list="carriers" placeholder="Servientrega, Coordinadora…" defaultValue={guide?.carrier ?? ""} />
        <datalist id="carriers">
          {["Servientrega", "Coordinadora", "Interrapidísimo", "Envía", "TCC", "Deprisa", "Entrega en tienda"].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="trackingNumber">N.º de guía de la transportadora</label>
        <input id="trackingNumber" name="trackingNumber" className="input" maxLength={40} defaultValue={guide?.trackingNumber ?? ""} />
      </div>
      <div className="field span-2">
        <label htmlFor="items">Productos del pedido</label>
        <textarea id="items" name="items" className="input textarea" rows={3} maxLength={600} placeholder="1 × Pioneer DJ DDJ-FLX4" defaultValue={guide?.items ?? ""} />
      </div>
      <div className="field span-2">
        <label htmlFor="publicNote">Nota para el cliente (opcional)</label>
        <input id="publicNote" name="publicNote" className="input" maxLength={200} placeholder="Ej.: la entrega es en la tarde" defaultValue={guide?.publicNote ?? ""} />
      </div>
    </div>
  );
}

/** Fecha local "AAAA-MM-DDTHH:MM" a partir de un inicio y un número de días. */
const plusDays = (start: string, days: number) => {
  const t = Date.parse(`${start}:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 16);
};


/**
 * Calendario automático: elegir el inicio rellena cada paso con los días sugeridos; luego cada
 * fecha se ajusta a mano. Un paso vacío se omite.
 */
function ScheduleFields({ events, defaultStart }: { events?: TrackingEvent[]; defaultStart: string }) {
  const initial = Object.fromEntries(STEPS.map((s) => [s.id, events?.find((e) => e.status === s.id)?.at])) as Record<string, string | undefined>;
  const [start, setStart] = useState(() => (events?.[0] ? isoToLocalInput(events[0].at) : defaultStart));
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(STEPS.map((s) => [s.id, initial[s.id] ? isoToLocalInput(initial[s.id]!) : events ? "" : plusDays(start, DEFAULT_OFFSETS[s.id])])),
  );
  const refill = (value: string) => {
    setStart(value);
    if (value) setDates(Object.fromEntries(STEPS.map((s) => [s.id, plusDays(value, DEFAULT_OFFSETS[s.id])])));
  };
  return (
    <fieldset className="fgroup schedule">
      <legend>Calendario automático</legend>
      <div className="field">
        <label htmlFor="start">Inicio (rellena las fechas sugeridas)</label>
        <input id="start" type="datetime-local" className="input" value={start} onChange={(e) => refill(e.target.value)} />
      </div>
      <ol className="schedule-steps">
        {STEPS.map((s) => (
          <li key={s.id}>
            <label htmlFor={`at_${s.id}`}>
              {s.label}
              <span className="note"> · día +{DEFAULT_OFFSETS[s.id]}</span>
            </label>
            <input id={`at_${s.id}`} name={`at_${s.id}`} type="datetime-local" className="input" value={dates[s.id] ?? ""} onChange={(e) => setDates((d) => ({ ...d, [s.id]: e.target.value }))} />
          </li>
        ))}
      </ol>
      <p className="note">Hora de Colombia. Deja una fecha vacía para saltar ese paso. El estado cambia solo al llegar cada fecha.</p>
    </fieldset>
  );
}

export function NewGuideForm({ defaultStart }: { defaultStart: string }) {
  const [state, action, pending] = useActionState(createGuide, undefined);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  return (
    <form action={action} className="stack admin-form">
      <DetailsFields />
      <fieldset className="fgroup">
        <legend>¿Cómo avanza el estado?</legend>
        <div className="segmented" role="radiogroup">
          <label className={mode === "auto" ? "on" : undefined}>
            <input type="radio" name="mode" value="auto" checked={mode === "auto"} onChange={() => setMode("auto")} />
            Automático por fechas
          </label>
          <label className={mode === "manual" ? "on" : undefined}>
            <input type="radio" name="mode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} />
            Manual
          </label>
        </div>
      </fieldset>
      {mode === "auto" ? (
        <ScheduleFields defaultStart={defaultStart} />
      ) : (
        <div className="field">
          <label htmlFor="status">Estado inicial</label>
          <select id="status" name="status" className="input" defaultValue="confirmado">
            {STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creando…" : "Crear guía"}
      </button>
    </form>
  );
}

export function DetailsForm({ guide }: { guide: Guide }) {
  const [state, action, pending] = useActionState(updateDetails.bind(null, guide.code), undefined);
  return (
    <form action={action} className="stack admin-form">
      <DetailsFields guide={guide} />
      <Message state={state} />
      <button type="submit" className="btn btn-secondary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}

export function ManualStatusForm({ code, current }: { code: string; current: StatusId | null }) {
  const [state, action, pending] = useActionState(setManualStatus.bind(null, code), undefined);
  const options: StatusId[] = [...STEPS.map((s) => s.id), "cancelado"];
  return (
    <form action={action} className="stack">
      <div className="status-picks" role="radiogroup" aria-label="Nuevo estado">
        {options.map((id) => (
          <label key={id} className={`pick${id === "cancelado" ? " danger" : ""}`}>
            <input type="radio" name="status" value={id} defaultChecked={id === current} required />
            <span>{STATUS_LABEL[id]}</span>
          </label>
        ))}
      </div>
      <div className="field">
        <label htmlFor="note">Nota en este paso (opcional, la ve el cliente)</label>
        <input id="note" name="note" className="input" maxLength={160} placeholder="Ej.: salió en el despacho de la mañana" />
      </div>
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Actualizando…" : "Cambiar estado"}
      </button>
    </form>
  );
}

export function ScheduleForm({ code, events, isAuto, defaultStart }: { code: string; events: TrackingEvent[]; isAuto: boolean; defaultStart: string }) {
  const [state, action, pending] = useActionState(saveSchedule.bind(null, code), undefined);
  return (
    <form action={action} className="stack">
      {/* Al venir de manual se arranca con un calendario sugerido desde ahora, no con el historial. */}
      <ScheduleFields events={isAuto ? events : undefined} defaultStart={defaultStart} />
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : isAuto ? "Guardar calendario" : "Pasar a automático"}
      </button>
    </form>
  );
}

export function DeleteGuideButton({ code }: { code: string }) {
  return (
    <form
      action={deleteGuide.bind(null, code)}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar la guía ${code}? El cliente ya no podrá consultarla.`)) e.preventDefault();
      }}
    >
      <button type="submit" className="textbtn danger">
        Eliminar guía
      </button>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          prompt("Copia el enlace:", url);
        }
      }}
    >
      {copied ? "¡Copiado!" : "Copiar enlace"}
    </button>
  );
}
