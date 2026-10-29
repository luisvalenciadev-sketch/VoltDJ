import { describe, expect, it } from "vitest";
import { defaultPayments, type PaymentSetting } from "@/config/payments";
import { enabledPayments, installmentOffer, paymentLabel } from "./payments";

const with_ = (patch: Partial<Record<PaymentSetting["id"], Partial<PaymentSetting>>>): PaymentSetting[] =>
  defaultPayments().map((s) => ({ ...s, ...patch[s.id] }));

describe("medios de pago", () => {
  it("solo muestra los activos, en orden fijo, con las cuotas en el nombre", () => {
    const s = with_({ addi: { enabled: true, installments: 6 }, transferencia: { enabled: true } });
    expect(enabledPayments(s).map((x) => x.id)).toEqual(["transferencia", "addi"]);
    expect(enabledPayments(s).map(paymentLabel)).toEqual(["Transferencia bancaria", "Addi (hasta 6 cuotas)"]);
  });

  it("la cuota de referencia es la más baja entre los medios a cuotas activos, redondeada al millar hacia arriba", () => {
    const s = with_({ addi: { enabled: true, installments: 6 }, sistecredito: { enabled: true, installments: 12 }, tarjeta: { enabled: false, installments: 36 } });
    expect(installmentOffer(1_500_000, s)).toEqual({ monthly: 125_000, months: 12, method: "Sistecrédito" });
    expect(installmentOffer(1_000_000, with_({ addi: { enabled: true, installments: 3 } }))).toEqual({ monthly: 334_000, months: 3, method: "Addi" });
  });

  it("sin medios a cuotas, sin precio o con una sola cuota no hay oferta", () => {
    expect(installmentOffer(1_000_000, with_({ transferencia: { enabled: true } }))).toBeNull();
    expect(installmentOffer(null, with_({ addi: { enabled: true } }))).toBeNull();
    expect(installmentOffer(1_000_000, with_({ addi: { enabled: true, installments: 1 } }))).toBeNull();
  });
});
