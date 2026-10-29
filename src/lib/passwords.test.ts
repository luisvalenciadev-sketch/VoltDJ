import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { hashPassword, passwordProblem, verifyPassword } = await import("./passwords");

describe("contraseñas de usuarios", () => {
  it("verifica la correcta y rechaza las demás, con sal distinta en cada hash", async () => {
    const a = await hashPassword("parlantes de la calle 17");
    const b = await hashPassword("parlantes de la calle 17");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("parlantes de la calle 17", a)).toBe(true);
    expect(await verifyPassword("parlantes de la calle 18", a)).toBe(false);
    expect(await verifyPassword("x", "texto-que-no-es-un-hash")).toBe(false);
  });

  it("exige al menos 10 caracteres", () => {
    expect(passwordProblem("corta")).toMatch(/10 caracteres/);
    expect(passwordProblem("una frase larga")).toBeNull();
  });
});
