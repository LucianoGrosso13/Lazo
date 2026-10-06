// Cobertura de la bifurcación por modo del cliente de cuentas para el flujo
// de invitación al fiador: mock emite un token local (referencia demo, sin
// red) y real delega en el backend (POST/GET /api/fiador/invitaciones).
// Misma superficie (`createInvitation`/`resolveInvitation`), dos destinos.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAccountCuotas } from "./accounts";
import { createMockCuotas } from "./mock";
import type { CuotasClient } from "./types";

const STUDENT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invitaciones — rama mock (token local)", () => {
  // El store de invitaciones del wrapper es estado de módulo: se limpia con
  // resetDemo para que cada test arranque sin residuos.
  beforeEach(async () => {
    await createAccountCuotas(createMockCuotas()).resetDemo();
  });

  it("emite una referencia local sin tocar la red y la resuelve", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const accounts = createAccountCuotas(createMockCuotas());

    const inv = await accounts.createInvitation(STUDENT);
    expect(inv.student).toBe(STUDENT);
    // El token demo es un hex opaco: no es el HMAC `v1.*` del servidor.
    expect(inv.token.startsWith("v1.")).toBe(false);
    expect(inv.completedAt).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    await expect(accounts.resolveInvitation(inv.token)).resolves.toMatchObject({
      token: inv.token,
      student: STUDENT,
      completedAt: null,
    });
    // Idempotente mientras sigue pendiente: mismo enlace para el estudiante.
    await expect(accounts.createInvitation(STUDENT)).resolves.toMatchObject({
      token: inv.token,
    });
    await expect(accounts.resolveInvitation("token-inexistente")).rejects.toMatchObject({
      code: "invalid_token",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("invitaciones — rama real (backend)", () => {
  // Base mínima en modo real: la invitación solo depende del fetch, nunca de
  // fixtures ni del estado financiero.
  const fakeBase = (over: Partial<CuotasClient> = {}) =>
    ({
      mode: "real",
      subscribe: () => () => {},
      ...over,
    }) as unknown as CuotasClient;

  function mockFetch(
    handler: (url: string, init?: { method?: string; body?: string }) => unknown,
  ) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        const out = handler(url, init) as { status: number; json: unknown };
        return {
          ok: out.status >= 200 && out.status < 300,
          status: out.status,
          json: async () => out.json,
        };
      }),
    );
  }

  it("createInvitation pega POST con {student} y usa el token del servidor", async () => {
    let seen: { url: string; method?: string; body?: string } | null = null;
    mockFetch((url, init) => {
      seen = { url, method: init?.method, body: init?.body };
      return {
        status: 201,
        json: {
          token: "v1.payload.sig",
          path: "/fiador/v1.payload.sig",
          student: STUDENT,
          issuedAt: 100,
          expiresAt: 200,
        },
      };
    });
    const accounts = createAccountCuotas(fakeBase());
    const inv = await accounts.createInvitation(STUDENT);
    expect(inv).toMatchObject({
      token: "v1.payload.sig",
      student: STUDENT,
      createdAt: 100,
      completedAt: null,
    });
    expect(seen).toMatchObject({ url: "/api/fiador/invitaciones", method: "POST" });
    expect(JSON.parse((seen as unknown as { body: string }).body)).toEqual({
      student: STUDENT,
    });
  });

  it("resolveInvitation consulta GET /api/fiador/invitaciones/<token>", async () => {
    let seenUrl: string | null = null;
    mockFetch((url) => {
      seenUrl = url;
      if (url.endsWith("/t-ok")) {
        return {
          status: 200,
          json: {
            student: STUDENT,
            issuedAt: 10,
            expiresAt: 20,
            completed: true,
            acceptance: { acceptedAt: 15 },
          },
        };
      }
      return { status: 404, json: { code: "invalid_token" } };
    });
    const accounts = createAccountCuotas(fakeBase());
    await expect(accounts.resolveInvitation("t-ok")).resolves.toMatchObject({
      student: STUDENT,
      createdAt: 10,
      completedAt: 15,
    });
    expect(seenUrl).toBe("/api/fiador/invitaciones/t-ok");
    await expect(accounts.resolveInvitation("t-bad")).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("falla cerrado cuando el backend no responde o contesta error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("conn refused");
      }),
    );
    const accounts = createAccountCuotas(fakeBase());
    await expect(accounts.createInvitation(STUDENT)).rejects.toMatchObject({
      code: "unavailable",
    });

    mockFetch(() => ({ status: 503, json: { code: "invite_not_configured" } }));
    await expect(accounts.createInvitation(STUDENT)).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});
