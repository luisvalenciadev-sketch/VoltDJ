"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createGuide, deleteGuide, login, savePayment, saveSchedule, setManualStatus, updateDetails, type FormState } from "@/app/admin/actions";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { formatCOP } from "@/lib/pricing";
import {
  addManualStatus,
  isoToLocalInput,
  localInputToISO,
  orderTotals,
  PAYMENT_LABEL,
  SCHEDULE_PRESETS,
  STATUS_LABEL,
  STEPS,
  timeline,
  type Guide,
  type OrderLine,
  type StatusId,
  type StepId,
  type TrackingEvent,
} from "@/lib/tracking";

export interface CatalogOption {
  id: string;
  name: string;
  price: number | null;
  category: string;
}

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p className={`alert ${state.error ? "err" : "ok"}`} role={state.error ? "alert" : "status"}>
      <span>{state.error ?? state.ok}</span>
    </p>
  );
}

/** Evita diferencias servidor/navegador en fechas y formatos: lo dependiente del reloj se pinta al montar. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 11);
const thousands = (n: number) => (n ? n.toLocaleString("es-CO") : "");

/** Pesos con separador de miles mientras se escribe; el formulario recibe solo dígitos. */
function MoneyInput({ id, name, label, value, onChange, hint }: { id: string; name?: string; label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="money">
        <span aria-hidden="true">$</span>
        <input id={id} className="input num" inputMode="numeric" autoComplete="off" value={thousands(value)} onChange={(e) => onChange(Number(digits(e.target.value) || 0))} placeholder="0" />
        {name && <input type="hidden" name={name} value={String(value)} />}
      </div>
      {hint && <span className="note">{hint}</span>}
    </div>
  );
}

// ---------- Ingreso ----------

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

// ---------- Secciones del formulario ----------

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="aform-sec" aria-labelledby={`sec-${n}`}>
      <header>
        <span className="aform-n" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 id={`sec-${n}`}>{title}</h2>
          {hint && <p className="note">{hint}</p>}
        </div>
      </header>
      <div className="aform-body">{children}</div>
    </section>
  );
}

function CustomerFields({ guide }: { guide?: Guide }) {
  return (
    <div className="admin-grid">
      <div className="field span-2">
        <label htmlFor="customerName">Nombre del cliente *</label>
        <input id="customerName" name="customerName" className="input" required maxLength={80} defaultValue={guide?.customerName} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="phone">Celular (WhatsApp)</label>
        <input id="phone" name="phone" className="input" inputMode="tel" maxLength={25} placeholder="300 123 4567" defaultValue={guide?.phone ?? ""} autoComplete="off" />
        <span className="note">Para enviarle el enlace. El cliente nunca lo ve en la consulta.</span>
      </div>
      <div className="field">
        <label htmlFor="city">Ciudad de entrega</label>
        <input id="city" name="city" className="input" maxLength={60} defaultValue={guide?.city ?? ""} />
      </div>
    </div>
  );
}

function ShippingFields({ guide }: { guide?: Guide }) {
  return (
    <div className="admin-grid">
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
        <input id="trackingNumber" name="trackingNumber" className="input" maxLength={40} defaultValue={guide?.trackingNumber ?? ""} placeholder="Se puede agregar después" />
      </div>
      <div className="field span-2">
        <label htmlFor="publicNote">Nota para el cliente</label>
        <input id="publicNote" name="publicNote" className="input" maxLength={200} placeholder="Ej.: la entrega es en la tarde" defaultValue={guide?.publicNote ?? ""} />
      </div>
    </div>
  );
}

/**
 * Productos y pagos. Los productos salen del catálogo con su precio vigente (editable si se
 * negoció otro) o se escriben a mano. El total, lo pagado y lo pendiente se calculan al instante.
 */
function OrderEditor({ catalog, lines, setLines, shipping, setShipping, paid, setPaid }: {
  catalog: CatalogOption[];
  lines: OrderLine[];
  setLines: (l: OrderLine[]) => void;
  shipping: number;
  setShipping: (n: number) => void;
  paid: number;
  setPaid: (n: number) => void;
}) {
  const [pick, setPick] = useState("");
  const [customName, setCustomName] = useState("");
  const t = orderTotals({ lines, shipping, paid });
  const byCategory = useMemo(() => {
    const m = new Map<string, CatalogOption[]>();
    for (const p of catalog) m.set(p.category, [...(m.get(p.category) ?? []), p]);
    return [...m];
  }, [catalog]);

  const add = () => {
    if (pick === "__custom") {
      const name = customName.trim();
      if (!name) return;
      setLines([...lines, { productId: null, name, qty: 1, unitPrice: 0 }]);
      setCustomName("");
    } else {
      const p = catalog.find((c) => c.id === pick);
      if (!p) return;
      const existing = lines.findIndex((l) => l.productId === p.id);
      if (existing >= 0) setLines(lines.map((l, i) => (i === existing ? { ...l, qty: Math.min(99, l.qty + 1) } : l)));
      else setLines([...lines, { productId: p.id, name: p.name, qty: 1, unitPrice: p.price ?? 0 }]);
    }
    setPick("");
  };
  const patch = (i: number, p: Partial<OrderLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <div className="stack">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="add-line">
        <div className="field">
          <label htmlFor="pick">Agregar producto *</label>
          <select id="pick" className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Elige del catálogo…</option>
            {byCategory.map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.price != null ? ` — ${formatCOP(p.price)}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="__custom">Otro producto (escribirlo)…</option>
          </select>
        </div>
        {pick === "__custom" && (
          <div className="field">
            <label htmlFor="customName">Nombre del producto</label>
            <input id="customName" className="input" maxLength={120} value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={add} disabled={!pick || (pick === "__custom" && !customName.trim())}>
          Agregar
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="empty-lines">Aún no hay productos. El pedido necesita al menos uno para calcular el total.</p>
      ) : (
        <ul className="order-lines" aria-label="Productos del pedido">
          {lines.map((l, i) => (
            <li key={`${l.productId ?? "x"}-${i}`}>
              <span className="ol-name">{l.name}</span>
              <label className="ol-qty">
                <span className="sr-only">Cantidad de {l.name}</span>
                <input className="input num" inputMode="numeric" value={l.qty} onChange={(e) => patch(i, { qty: Math.max(1, Math.min(99, Number(digits(e.target.value)) || 1)) })} />
              </label>
              <label className="ol-price money">
                <span className="sr-only">Precio unitario de {l.name}</span>
                <span aria-hidden="true">$</span>
                <input className="input num" inputMode="numeric" value={thousands(l.unitPrice)} placeholder="0" onChange={(e) => patch(i, { unitPrice: Number(digits(e.target.value) || 0) })} />
              </label>
              <span className="ol-total num">{formatCOP(l.qty * l.unitPrice)}</span>
              <button type="button" className="textbtn danger" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label={`Quitar ${l.name}`}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="admin-grid">
        <MoneyInput id="shipping" name="shipping" label="Costo de envío" value={shipping} onChange={setShipping} hint="0 si va incluido o lo cobra la transportadora." />
        <div className="field">
          <MoneyInput id="paid" name="paid" label="Pago recibido" value={paid} onChange={setPaid} />
          <div className="quick">
            <button type="button" className="chip" onClick={() => setPaid(0)}>
              Nada aún
            </button>
            <button type="button" className="chip" onClick={() => setPaid(Math.round(t.total / 2 / 1000) * 1000)} disabled={!t.total}>
              50 %
            </button>
            <button type="button" className="chip" onClick={() => setPaid(t.total)} disabled={!t.total}>
              Todo
            </button>
          </div>
        </div>
      </div>

      <Totals totals={t} />
    </div>
  );
}

function Totals({ totals: t }: { totals: ReturnType<typeof orderTotals> }) {
  return (
    <dl className="totals" aria-live="polite">
      <div>
        <dt>Total del pedido</dt>
        <dd className="num">{formatCOP(t.total)}</dd>
      </div>
      <div>
        <dt>Pagado</dt>
        <dd className="num">{formatCOP(t.paid)}</dd>
      </div>
      <div className="due" data-state={t.state}>
        <dt>{t.pending > 0 ? "Pendiente para la entrega" : "Pendiente"}</dt>
        <dd className="num">{formatCOP(t.pending)}</dd>
      </div>
      <span className="pay-chip" data-state={t.state}>
        {PAYMENT_LABEL[t.state]}
      </span>
    </dl>
  );
}

const plusDays = (start: string, days: number) => new Date(Date.parse(`${start}:00Z`) + days * 86_400_000).toISOString().slice(0, 16);

/**
 * Calendario: un preajuste de un clic llena todas las fechas desde el inicio; cada paso puede
 * desactivarse (se salta) o ajustarse. Informa los eventos válidos para la vista previa.
 */
function ScheduleEditor({ events, defaultStart, onEvents }: { events?: TrackingEvent[]; defaultStart: string; onEvents?: (e: TrackingEvent[]) => void }) {
  const fromEvents = (id: StepId) => events?.find((e) => e.status === id)?.at;
  const [start, setStart] = useState(() => (events?.[0] ? isoToLocalInput(events[0].at) : defaultStart));
  const [preset, setPreset] = useState(events ? "" : "estandar");
  const [rows, setRows] = useState<Record<StepId, { on: boolean; at: string }>>(() => {
    const base = SCHEDULE_PRESETS[1].offsets;
    return Object.fromEntries(
      STEPS.map((s) => {
        const ev = fromEvents(s.id);
        return [s.id, events ? { on: Boolean(ev), at: ev ? isoToLocalInput(ev) : plusDays(start, base[s.id]) } : { on: true, at: plusDays(start, base[s.id]) }];
      }),
    ) as Record<StepId, { on: boolean; at: string }>;
  });

  const applyPreset = (id: string, from = start) => {
    const p = SCHEDULE_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setRows(Object.fromEntries(STEPS.map((s) => [s.id, { on: true, at: plusDays(from, p.offsets[s.id]) }])) as typeof rows);
  };

  useEffect(() => {
    onEvents?.(STEPS.flatMap((s) => (rows[s.id].on && localInputToISO(rows[s.id].at) ? [{ status: s.id, at: localInputToISO(rows[s.id].at)! }] : [])));
  }, [rows, onEvents]);

  return (
    <div className="stack">
      <div className="presets" role="radiogroup" aria-label="Calendario sugerido">
        {SCHEDULE_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className="preset" onClick={() => applyPreset(p.id)}>
            <b>{p.label}</b>
            <span>{p.hint}</span>
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="start">Desde</label>
        <input
          id="start"
          type="datetime-local"
          className="input"
          value={start}
          onChange={(e) => {
            setStart(e.target.value);
            if (e.target.value && preset) applyPreset(preset, e.target.value);
          }}
        />
      </div>
      <ol className="schedule-steps">
        {STEPS.map((s) => {
          const r = rows[s.id];
          return (
            <li key={s.id} data-off={!r.on || undefined}>
              <label className="step-toggle">
                <input type="checkbox" checked={r.on} onChange={(e) => (setRows({ ...rows, [s.id]: { ...r, on: e.target.checked } }), setPreset(""))} />
                <span>{s.label}</span>
              </label>
              <label className="sr-only" htmlFor={`at_${s.id}`}>
                Fecha de {s.label}
              </label>
              <input
                id={`at_${s.id}`}
                name={`at_${s.id}`}
                type="datetime-local"
                className="input"
                value={r.at}
                disabled={!r.on}
                onChange={(e) => (setRows({ ...rows, [s.id]: { ...r, at: e.target.value } }), setPreset(""))}
              />
            </li>
          );
        })}
      </ol>
      <p className="note">Hora de Colombia. Un paso desmarcado se salta. El estado cambia solo al llegar cada fecha.</p>
    </div>
  );
}

function ModeCards({ mode, setMode }: { mode: "auto" | "manual"; setMode: (m: "auto" | "manual") => void }) {
  return (
    <div className="mode-cards" role="radiogroup" aria-label="Cómo avanza el estado">
      <label className="mode-card" data-on={mode === "auto" || undefined}>
        <input type="radio" name="mode" value="auto" checked={mode === "auto"} onChange={() => setMode("auto")} />
        <b>Automático</b>
        <span>Avanza solo en las fechas que definas. Ideal para envíos con tiempos conocidos.</span>
      </label>
      <label className="mode-card" data-on={mode === "manual" || undefined}>
        <input type="radio" name="mode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} />
        <b>Manual</b>
        <span>Tú cambias cada estado cuando pasa. Para pedidos con tiempos inciertos.</span>
      </label>
    </div>
  );
}

/** Vista previa en vivo de la página del cliente: se arma con los mismos cálculos que la real. */
function LivePreview({ events, totals, nowISO }: { events: TrackingEvent[]; totals: ReturnType<typeof orderTotals>; nowISO: string }) {
  const mounted = useMounted();
  const now = new Date(nowISO);
  const current = timeline({ events }, now).find((s) => s.state === "current");
  return (
    <aside className="panel preview" aria-label="Vista previa para el cliente">
      <span className="eyebrow">Así lo verá el cliente</span>
      <h2 className="disp">{current ? current.label : "Pedido registrado"}</h2>
      {mounted ? <TrackingTimeline items={timeline({ events }, now)} /> : <div className="sk" style={{ height: 280 }} />}
      {totals.total > 0 && (
        <p className="note">
          Total {formatCOP(totals.total)} · {totals.pending > 0 ? `pendiente ${formatCOP(totals.pending)} al entregar` : "pagado"}
        </p>
      )}
    </aside>
  );
}

// ---------- Nueva guía ----------

export function NewGuideForm({ catalog, defaultStart, nowISO }: { catalog: CatalogOption[]; defaultStart: string; nowISO: string }) {
  const [state, action, pending] = useActionState(createGuide, undefined);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [shipping, setShipping] = useState(0);
  const [paid, setPaid] = useState(0);
  const [schedule, setSchedule] = useState<TrackingEvent[]>([]);
  const [initial, setInitial] = useState<StatusId>("confirmado");
  const totals = orderTotals({ lines, shipping, paid });
  const previewEvents = mode === "auto" ? schedule : addManualStatus([], initial, new Date(nowISO));

  return (
    <form action={action} className="aform">
      <div className="aform-main">
        <Section n={1} title="Cliente">
          <CustomerFields />
        </Section>
        <Section n={2} title="Pedido y pago" hint="Los precios salen del catálogo (con descuento vigente). Puedes ajustarlos si negociaste otro.">
          <OrderEditor catalog={catalog} lines={lines} setLines={setLines} shipping={shipping} setShipping={setShipping} paid={paid} setPaid={setPaid} />
        </Section>
        <Section n={3} title="Envío">
          <ShippingFields />
        </Section>
        <Section n={4} title="Seguimiento" hint="Puedes cambiar de modo cuando quieras desde la guía.">
          <ModeCards mode={mode} setMode={setMode} />
          {mode === "auto" ? (
            <ScheduleEditor defaultStart={defaultStart} onEvents={setSchedule} />
          ) : (
            <div className="field">
              <label htmlFor="status">Estado inicial</label>
              <select id="status" name="status" className="input" value={initial} onChange={(e) => setInitial(e.target.value as StatusId)}>
                {STEPS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Section>
      </div>
      <LivePreview events={previewEvents} totals={totals} nowISO={nowISO} />
      <div className="aform-bar">
        <Message state={state} />
        <span className="note">
          {lines.length === 0 ? "Agrega al menos un producto para crear la guía." : `${totals.units} ${totals.units === 1 ? "producto" : "productos"} · total ${formatCOP(totals.total)}`}
        </span>
        <button type="submit" className="btn btn-primary" disabled={pending || lines.length === 0}>
          {pending ? "Creando…" : "Crear guía"}
        </button>
      </div>
    </form>
  );
}

// ---------- Guía existente ----------

/** El paso siguiente con un solo clic: es lo que el asesor hace casi siempre. */
export function AdvanceForm({ code, next }: { code: string; next: StatusId }) {
  const [state, action, pending] = useActionState(setManualStatus.bind(null, code), undefined);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="status" value={next} />
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Actualizando…" : `Marcar como: ${STATUS_LABEL[next]}`}
      </button>
      <Message state={state} />
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
      <button type="submit" className="btn btn-secondary" disabled={pending}>
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
      <ScheduleEditor events={isAuto ? events : undefined} defaultStart={defaultStart} />
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : isAuto ? "Guardar calendario" : "Activar modo automático"}
      </button>
    </form>
  );
}

/** Modo de la guía como pestañas: se ve cuál está activo y qué implica cambiar. */
export function StatusModes({ code, mode, events, current, defaultStart }: { code: string; mode: "auto" | "manual"; events: TrackingEvent[]; current: StatusId | null; defaultStart: string }) {
  const [tab, setTab] = useState(mode);
  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Modo de seguimiento">
        {(["auto", "manual"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={tab === m} className={tab === m ? "on" : undefined} onClick={() => setTab(m)}>
            {m === "auto" ? "Automático" : "Manual"}
            {mode === m && <span className="dot" aria-label=" (activo)" />}
          </button>
        ))}
      </div>
      {tab === "manual" ? (
        <>
          {mode === "auto" && <p className="note">Al cambiar el estado a mano, el calendario se detiene y la guía pasa a modo manual.</p>}
          <ManualStatusForm code={code} current={current} />
        </>
      ) : (
        <>
          {mode === "manual" && <p className="note">Define las fechas y la guía avanzará sola desde ahora.</p>}
          <ScheduleForm code={code} events={events} isAuto={mode === "auto"} defaultStart={defaultStart} />
        </>
      )}
    </div>
  );
}

export function PaymentForm({ code, total, paid }: { code: string; total: number; paid: number }) {
  const [state, action, pending] = useActionState(savePayment.bind(null, code), undefined);
  const [value, setValue] = useState(paid);
  const t = orderTotals({ lines: [{ productId: null, name: "", qty: 1, unitPrice: total }], shipping: 0, paid: value });
  return (
    <form action={action} className="stack">
      <MoneyInput id="pay" name="paid" label="Total recibido hasta hoy" value={value} onChange={setValue} />
      <Totals totals={t} />
      <Message state={state} />
      <div className="row-wrap">
        <button type="submit" className="btn btn-secondary" disabled={pending || value === paid}>
          Guardar pago
        </button>
        {paid < total && (
          <button type="submit" name="full" value="1" className="btn btn-ghost" disabled={pending}>
            Marcar todo como pagado
          </button>
        )}
      </div>
    </form>
  );
}

export function EditDetailsForm({ guide, catalog }: { guide: Guide; catalog: CatalogOption[] }) {
  const [state, action, pending] = useActionState(updateDetails.bind(null, guide.code), undefined);
  const [lines, setLines] = useState<OrderLine[]>(guide.lines);
  const [shipping, setShipping] = useState(guide.shipping);
  const [paid, setPaid] = useState(guide.paid);
  return (
    <form action={action} className="stack">
      <CustomerFields guide={guide} />
      <OrderEditor catalog={catalog} lines={lines} setLines={setLines} shipping={shipping} setShipping={setShipping} paid={paid} setPaid={setPaid} />
      <ShippingFields guide={guide} />
      <Message state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending || lines.length === 0}>
        {pending ? "Guardando…" : "Guardar cambios"}
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

export function CopyLink({ url, label = "Copiar enlace" }: { url: string; label?: string }) {
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
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
