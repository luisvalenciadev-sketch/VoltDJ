/**
 * Envíos por zona: tiempo de entrega y costo opcional (vacío = se cotiza por WhatsApp), y despacho el
 * mismo día con hora de corte. No calcula envíos por peso: el asesor confirma el valor final.
 */
export interface ShippingZone {
  id: string;
  /** "Ibagué", "Bogotá y Medellín", "Resto del país". */
  name: string;
  /** "1 día hábil", "2 a 4 días hábiles". */
  days: string;
  /** COP; null = se cotiza; 0 = gratis. */
  cost: number | null;
}

export interface SameDay {
  enabled: boolean;
  /** "HH:MM", hora de Colombia. */
  cutoff: string;
  /** Dónde aplica: "Ibagué". Vacío = donde la tienda despache. */
  area: string;
}

/** "14:00" → "2:00 p. m.", como se escribe la hora en Colombia. */
export function formatHour(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const suffix = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${suffix}`;
}

export function sameDayText(s: SameDay): string | null {
  if (!s.enabled || !/^\d{1,2}:\d{2}$/.test(s.cutoff)) return null;
  return `Pide antes de las ${formatHour(s.cutoff)} y despachamos el mismo día${s.area.trim() ? ` en ${s.area.trim()}` : ""}.`;
}

/** Costo como se lee en la tienda: "Gratis", "$ 12.000" o "Se cotiza". */
export function zoneCostLabel(cost: number | null, format: (n: number) => string): string {
  if (cost == null) return "Se cotiza";
  return cost === 0 ? "Gratis" : format(cost);
}
