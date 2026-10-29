/**
 * Seguimiento de pedidos (guías). Lógica pura, sin base de datos: qué estado tiene una guía en
 * un momento dado y qué línea de tiempo ve el cliente.
 *
 * Dos modos:
 *  - "auto": la guía guarda un calendario (estado + fecha). El estado vigente es el último paso
 *    cuya fecha ya pasó. No hay tareas programadas: se calcula al consultar.
 *  - "manual": el asesor cambia el estado a mano; cada cambio queda en el historial.
 * Al pasar de auto a manual se congela lo ya ocurrido; al volver a auto se arma un calendario nuevo.
 */
export const STEPS = [
  { id: "confirmado", label: "Pedido confirmado", short: "Confirmado", detail: "Un asesor confirmó tu pedido por WhatsApp." },
  { id: "pago_recibido", label: "Pago recibido", short: "Pago", detail: "Recibimos y verificamos tu pago." },
  { id: "preparando", label: "Preparando tu pedido", short: "Preparando", detail: "Revisamos y empacamos tus equipos." },
  { id: "enviado", label: "Enviado", short: "Enviado", detail: "Tu pedido salió con la transportadora." },
  { id: "en_reparto", label: "En reparto", short: "En reparto", detail: "La transportadora lo está llevando a tu dirección." },
  { id: "entregado", label: "Entregado", short: "Entregado", detail: "Tu pedido fue entregado. ¡Que lo disfrutes!" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
/** Desvíos de la entrega: no son pasos de la lista; aparecen antes de "Entregado" mientras duran. */
export type ExceptionId = "entrega_fallida" | "reprogramado";
export type StatusId = StepId | ExceptionId | "cancelado";
export type Mode = "auto" | "manual";

export const CANCELLED = { id: "cancelado", label: "Pedido cancelado", short: "Cancelado", detail: "Este pedido fue cancelado. Escríbenos si tienes dudas." } as const;
export const EXCEPTIONS: Record<ExceptionId, { id: ExceptionId; label: string; short: string; detail: string }> = {
  entrega_fallida: { id: "entrega_fallida", label: "Entrega fallida", short: "Falló entrega", detail: "No pudimos entregar tu pedido. Elige una nueva fecha y lo intentamos de nuevo." },
  reprogramado: { id: "reprogramado", label: "Entrega reprogramada", short: "Reprogramado", detail: "Tu entrega quedó reprogramada." },
};
export const isException = (s: StatusId | null | undefined): s is ExceptionId => s === "entrega_fallida" || s === "reprogramado";

export const STATUS_LABEL: Record<StatusId, string> = {
  ...(Object.fromEntries(STEPS.map((s) => [s.id, s.label])) as Record<StepId, string>),
  entrega_fallida: EXCEPTIONS.entrega_fallida.label,
  reprogramado: EXCEPTIONS.reprogramado.label,
  cancelado: CANCELLED.label,
};

export const isStatus = (v: unknown): v is StatusId => typeof v === "string" && v in STATUS_LABEL;

/** Motivos frecuentes de una entrega fallida (el asesor elige uno; el cliente lo ve). */
export const FAIL_REASONS = ["No había nadie en la dirección", "El cliente no contestó el teléfono", "Dirección incorrecta o incompleta", "El cliente pidió cambiar la fecha", "Zona sin acceso para la transportadora"];

/**
 * Desde que el pedido sale a reparto, sus productos y montos quedan fijos: cambiarlos con el
 * paquete en camino descuadra lo que se cobra en la entrega. Los pagos sí se pueden registrar.
 */
export const LOCKED_FROM: StatusId[] = ["en_reparto", "entrega_fallida", "reprogramado", "entregado", "cancelado"];
export const isOrderLocked = (s: StatusId | null | undefined) => Boolean(s && LOCKED_FROM.includes(s));

/** Un paso con fecha: en "auto" es el plan; en "manual" es el historial de cambios. */
export interface TrackingEvent {
  status: StatusId;
  /** ISO 8601 con zona. */
  at: string;
  note?: string;
  /** Solo en "entregado": quién recibió el pedido. */
  receivedBy?: string;
  /** Solo en "reprogramado": nueva fecha acordada, "AAAA-MM-DD". */
  rescheduledFor?: string;
}

/** Fecha sin hora ("2026-11-05") en palabras: "jueves 5 de noviembre". */
export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

/**
 * Fecha que el cliente elige para reprogramar: desde mañana hasta 30 días (hora de Colombia).
 * Devuelve la fecha normalizada o un mensaje de error para mostrarle.
 */
export function validateRescheduleDay(day: string, now: Date = new Date()): { day: string } | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T12:00:00Z`))) return { error: "Elige una fecha válida." };
  const today = new Date(now.getTime() - 5 * 3_600_000).toISOString().slice(0, 10); // hoy en Colombia
  const plus = (n: number) => new Date(Date.parse(`${today}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  if (day < plus(1)) return { error: "La nueva fecha debe ser a partir de mañana." };
  if (day > plus(30)) return { error: "Elige una fecha dentro de los próximos 30 días." };
  return { day };
}

/** Nombres de ejemplo para probar "Entregado a…" mientras se valida el dato real con la transportadora. */
const SAMPLE_RECIPIENTS = ["Carolina Restrepo", "Andrés Ríos", "Marta Lucía Gómez", "Julián Cárdenas", "Paola Herrera", "Santiago Muñoz", "Diana Ospina", "Felipe Arango"];
export const sampleRecipient = (random: () => number = Math.random) => SAMPLE_RECIPIENTS[Math.floor(random() * SAMPLE_RECIPIENTS.length)];

/** Línea del pedido. El precio queda congelado al crear la guía: si el catálogo cambia, el pedido no. */
export interface OrderLine {
  /** Id del producto del catálogo, o null si se escribió a mano. */
  productId: string | null;
  name: string;
  qty: number;
  /** COP, entero. */
  unitPrice: number;
}

export interface Guide {
  code: string;
  customerName: string;
  /** Solo para el panel (enviar el enlace por WhatsApp). Nunca se muestra en la consulta pública. */
  phone: string | null;
  city: string | null;
  lines: OrderLine[];
  /** Costo de envío en COP (0 si va incluido o se cobra aparte). */
  shipping: number;
  /** Total recibido hasta ahora en COP. */
  paid: number;
  /** Texto libre de guías antiguas, anteriores a las líneas de producto. */
  items: string;
  carrier: string | null;
  trackingNumber: string | null;
  mode: Mode;
  events: TrackingEvent[];
  /** Nota visible para el cliente (p. ej. "Llega en la tarde"). */
  publicNote: string | null;
  /**
   * Unidades que este pedido tiene apartadas del inventario (src/lib/order-stock.ts). Sin valor = guía creada
   * antes de conectar el inventario: no aparta ni devuelve nada, porque su stock ya se ajustó a mano.
   */
  stockApplied?: { productId: string; qty: number }[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentState = "sin_pago" | "parcial" | "pagado";
export const PAYMENT_LABEL: Record<PaymentState, string> = { sin_pago: "Sin pago", parcial: "Pago parcial", pagado: "Pagado" };

/** Cuentas del pedido: lo pendiente es lo que se cobra al entregar. */
export function orderTotals(g: Pick<Guide, "lines" | "shipping" | "paid">) {
  const subtotal = g.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const total = subtotal + g.shipping;
  const paid = Math.min(Math.max(0, g.paid), total);
  const pending = total - paid;
  const state: PaymentState = total > 0 && pending === 0 ? "pagado" : paid > 0 ? "parcial" : "sin_pago";
  return { subtotal, total, paid, pending, state, units: g.lines.reduce((s, l) => s + l.qty, 0) };
}

/** Pesos escritos a mano ("1.105.000", "$ 800000") a entero. Vacío = 0; texto inválido = null. */
export function parseCOP(input: string): number | null {
  const clean = input.replace(/[$\s.]/g, "").replace(/,00$/, "");
  if (!clean) return 0;
  return /^\d{1,11}$/.test(clean) ? Number(clean) : null;
}

/** Calendario sugerido al crear una guía automática: días después de la fecha de inicio. */
export const DEFAULT_OFFSETS: Record<StepId, number> = {
  confirmado: 0,
  pago_recibido: 0,
  preparando: 1,
  enviado: 2,
  en_reparto: 4,
  entregado: 5,
};

/** Calendarios de un clic para el caso común; cada fecha se puede ajustar después. */
export const SCHEDULE_PRESETS: { id: string; label: string; hint: string; offsets: Record<StepId, number> }[] = [
  { id: "rapido", label: "Rápido", hint: "2 días · misma ciudad", offsets: { confirmado: 0, pago_recibido: 0, preparando: 0, enviado: 1, en_reparto: 2, entregado: 2 } },
  { id: "estandar", label: "Estándar", hint: "5 días · nacional", offsets: DEFAULT_OFFSETS },
  { id: "lejano", label: "Lejano", hint: "8 días · zonas apartadas", offsets: { confirmado: 0, pago_recibido: 0, preparando: 1, enviado: 2, en_reparto: 6, entregado: 8 } },
];

/** Siguiente paso de la lista tras el estado actual (para el botón "Marcar como…"). */
export function nextStep(current: StatusId | null): StepId | null {
  if (current === "cancelado" || current === "entregado") return null;
  // Tras una entrega fallida o reprogramada, lo siguiente es volver a salir a reparto.
  if (isException(current)) return "en_reparto";
  const i = current ? STEPS.findIndex((s) => s.id === current) : -1;
  return STEPS[i + 1]?.id ?? null;
}

const byDate = (a: TrackingEvent, b: TrackingEvent) => Date.parse(a.at) - Date.parse(b.at);

/** Eventos ya ocurridos (fecha ≤ ahora), en orden. */
export function pastEvents(events: TrackingEvent[], now: Date = new Date()): TrackingEvent[] {
  return [...events].filter((e) => Date.parse(e.at) <= now.getTime()).sort(byDate);
}

/** Estado vigente: el último evento ocurrido; antes del primero, la guía aún no arranca. */
export function currentStatus(guide: Pick<Guide, "events">, now: Date = new Date()): TrackingEvent | null {
  const past = pastEvents(guide.events, now);
  return past[past.length - 1] ?? null;
}

/** Próximo paso programado (solo modo auto), para mostrar "siguiente: … el …". */
export function nextScheduled(guide: Pick<Guide, "events" | "mode">, now: Date = new Date()): TrackingEvent | null {
  if (guide.mode !== "auto") return null;
  return [...guide.events].filter((e) => Date.parse(e.at) > now.getTime()).sort(byDate)[0] ?? null;
}

export type TimelineState = "done" | "current" | "pending";
export interface TimelineItem {
  id: StatusId;
  label: string;
  /** Etiqueta corta para la vista horizontal (cabe en 1–2 líneas en un celular). */
  short: string;
  detail: string;
  state: TimelineState;
  /** Fecha en que ocurrió (solo pasos hechos o actual). */
  at: string | null;
  note?: string;
}

/**
 * Línea de tiempo para el cliente: los seis pasos en orden, marcando hechos, actual y pendientes.
 * Las fechas futuras del calendario no se muestran: son estimadas y prometerlas crea reclamos.
 * Si está cancelado, se muestra lo ocurrido hasta entonces y la cancelación al final.
 */
export function timeline(guide: Pick<Guide, "events">, now: Date = new Date()): TimelineItem[] {
  const past = pastEvents(guide.events, now);
  const current = past[past.length - 1] ?? null;
  const lastAt = (id: StatusId) => [...past].reverse().find((e) => e.status === id);

  if (current?.status === "cancelado") {
    const reached = STEPS.filter((s) => lastAt(s.id));
    return [
      ...reached.map((s) => ({ id: s.id, label: s.label, short: s.short, detail: s.detail, state: "done" as const, at: lastAt(s.id)!.at, note: lastAt(s.id)!.note })),
      { id: CANCELLED.id, label: CANCELLED.label, short: CANCELLED.short, detail: CANCELLED.detail, state: "current", at: current.at, note: current.note },
    ];
  }

  const detailFor = (id: StepId, ev?: TrackingEvent) => (id === "entregado" && ev?.receivedBy ? `Recibido por ${ev.receivedBy}.` : STEPS.find((s) => s.id === id)!.detail);

  // Desvío de entrega vigente: todo hasta "En reparto" quedó hecho; el desvío es el paso actual
  // (si es reprogramación, se muestra también la entrega fallida que la originó) y "Entregado" sigue pendiente.
  if (isException(current?.status)) {
    const base = STEPS.filter((s) => s.id !== "entregado").map((s) => {
      const ev = lastAt(s.id);
      return { id: s.id, label: s.label, short: s.short, detail: s.detail, state: "done" as const, at: ev?.at ?? null, note: ev?.note };
    });
    const exc = (ev: TrackingEvent, state: TimelineState): TimelineItem => {
      const e = EXCEPTIONS[ev.status as ExceptionId];
      const detail = ev.status === "reprogramado" && ev.rescheduledFor ? `Nueva fecha de entrega: ${formatDay(ev.rescheduledFor)}.` : e.detail;
      return { id: e.id, label: e.label, short: e.short, detail, state, at: ev.at, note: ev.note };
    };
    const failed = current!.status === "reprogramado" ? lastAt("entrega_fallida") : undefined;
    const delivered = STEPS[STEPS.length - 1];
    return [
      ...base,
      ...(failed ? [exc(failed, "done")] : []),
      exc(current!, "current"),
      { id: delivered.id, label: delivered.label, short: delivered.short, detail: delivered.detail, state: "pending", at: null },
    ];
  }

  const currentIndex = current ? STEPS.findIndex((s) => s.id === current.status) : -1;
  return STEPS.map((s, i) => {
    const ev = lastAt(s.id);
    const state: TimelineState = i < currentIndex ? "done" : i === currentIndex ? "current" : "pending";
    // Un paso anterior saltado (p. ej. se marcó "Enviado" directo) se muestra hecho, sin fecha propia.
    return { id: s.id, label: s.label, short: s.short, detail: state === "pending" ? s.detail : detailFor(s.id, ev), state, at: state === "pending" ? null : (ev?.at ?? null), note: state === "pending" ? undefined : ev?.note };
  });
}

/** Calendario automático a partir de una fecha de inicio y días por paso. */
export function buildSchedule(start: Date, offsets: Partial<Record<StepId, number>> = DEFAULT_OFFSETS): TrackingEvent[] {
  return STEPS.filter((s) => offsets[s.id] != null).map((s) => ({ status: s.id, at: new Date(start.getTime() + (offsets[s.id] as number) * 86_400_000).toISOString() }));
}

/** Pasar a manual: se conserva lo ya ocurrido y se descarta lo que estaba programado. */
export function freezeToManual(events: TrackingEvent[], now: Date = new Date()): TrackingEvent[] {
  return pastEvents(events, now);
}

/** Cambio manual de estado: se agrega al historial con la hora actual. */
export function addManualStatus(events: TrackingEvent[], status: StatusId, now: Date = new Date(), note?: string, extra: Pick<TrackingEvent, "receivedBy" | "rescheduledFor"> = {}): TrackingEvent[] {
  return [...events, { status, at: now.toISOString(), ...(note ? { note } : {}), ...(extra.receivedBy ? { receivedBy: extra.receivedBy } : {}), ...(extra.rescheduledFor ? { rescheduledFor: extra.rescheduledFor } : {}) }];
}

/**
 * Código de guía legible y difícil de adivinar: VD-XXXX-XXXX con un alfabeto sin caracteres
 * confundibles (sin 0/O, 1/I/L). 31^8 ≈ 8,5 × 10^11 combinaciones.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function createGuideCode(prefix = "VD", random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Acepta lo que el cliente escriba (minúsculas, espacios, sin guiones) y lo lleva al formato del código. */
export function normalizeGuideCode(input: string, prefix = "VD"): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  if (!/^[A-Z0-9]{8}$/.test(body)) return null;
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}

/**
 * Fechas del panel: <input type="datetime-local"> entrega "2026-11-03T14:00" sin zona.
 * La tienda opera en Colombia (UTC−5 todo el año, sin horario de verano).
 */
export const STORE_UTC_OFFSET = "-05:00";
export function localInputToISO(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}:00${STORE_UTC_OFFSET}`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
export function isoToLocalInput(iso: string): string {
  const d = new Date(Date.parse(iso) - 5 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

export function formatTrackingDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
