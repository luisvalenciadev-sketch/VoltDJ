import { describe, expect, it } from "vitest";
import { formatCOP } from "./pricing";
import { formatHour, sameDayText, zoneCostLabel } from "./shipping";

describe("envíos", () => {
  it("escribe la hora como en Colombia", () => {
    expect(formatHour("14:00")).toBe("2:00 p. m.");
    expect(formatHour("09:30")).toBe("9:30 a. m.");
    expect(formatHour("12:00")).toBe("12:00 p. m.");
    expect(formatHour("0:15")).toBe("12:15 a. m.");
  });

  it("anuncia el despacho del mismo día solo si está activo", () => {
    expect(sameDayText({ enabled: true, cutoff: "14:00", area: "Ibagué" })).toBe("Pide antes de las 2:00 p. m. y despachamos el mismo día en Ibagué.");
    expect(sameDayText({ enabled: true, cutoff: "14:00", area: "" })).toBe("Pide antes de las 2:00 p. m. y despachamos el mismo día.");
    expect(sameDayText({ enabled: false, cutoff: "14:00", area: "Ibagué" })).toBeNull();
  });

  it("el costo vacío se cotiza y el cero es gratis", () => {
    expect(zoneCostLabel(null, formatCOP)).toBe("Se cotiza");
    expect(zoneCostLabel(0, formatCOP)).toBe("Gratis");
    expect(zoneCostLabel(12000, formatCOP)).toBe("$ 12.000");
  });
});
