import { isAddress } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { CATALOG, getProduct } from "../catalog";
import { DEMO_CONFIG } from "../cuotas/demo-config";
import { DEMO_MERCHANT } from "../cuotas/format";
import { createMockCuotas } from "../cuotas/mock";
import { CATEGORIES, MERCHANTS, type CategoryId } from "./data";
import {
  featuredMerchants,
  getCategory,
  getDirectoryMerchant,
  normalizeSearch,
  searchMerchants,
} from "./index";

describe("directorio de comercios demo", () => {
  it("tiene ~10 comercios cubriendo las 6 categorías", () => {
    expect(MERCHANTS.length).toBeGreaterThanOrEqual(9);
    expect(MERCHANTS.length).toBeLessThanOrEqual(12);
    const used = new Set(MERCHANTS.map((m) => m.category));
    for (const c of CATEGORIES) expect(used).toContain(c.id);
  });

  it("todos son demo, con direcciones únicas y válidas (base58, 32 bytes)", () => {
    const addresses = MERCHANTS.map((m) => m.address);
    expect(new Set(addresses).size).toBe(addresses.length);
    for (const m of MERCHANTS) {
      expect(m.demo).toBe(true);
      expect(isAddress(m.address)).toBe(true);
    }
  });

  it("los ids de producto son únicos y ninguno supera el tope máximo de la config", () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const maxPurchase = Math.max(
      ...DEMO_CONFIG.guaranteedTiers.map((t) => t.maxPurchase),
    );
    for (const p of CATALOG) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.price).toBeLessThanOrEqual(maxPurchase);
      expect(p.image).toBe(`/products/${p.id}.webp`);
      expect(getDirectoryMerchant(p.merchant)).not.toBeNull();
    }
  });

  it("Voltia conserva pc/notebook/curso con los mismos precios", () => {
    const voltia = getDirectoryMerchant(DEMO_MERCHANT);
    expect(voltia?.name).toBe("Voltia");
    expect(voltia?.category).toBe("electronics");
    expect(voltia?.products.map((p) => p.id)).toEqual(["pc", "notebook", "curso"]);
    expect(getProduct("pc")).toMatchObject({ price: 1_000_000_000, merchant: DEMO_MERCHANT });
    expect(getProduct("notebook")).toMatchObject({ price: 650_000_000 });
    expect(getProduct("curso")).toMatchObject({ price: 120_000_000 });
  });

  it("getProduct resuelve cualquier producto y expone su comercio", () => {
    for (const p of CATALOG) {
      const found = getProduct(p.id);
      expect(found).not.toBeNull();
      expect(found!.merchant).toBe(
        MERCHANTS.find((m) => m.products.some((mp) => mp.id === p.id))!.address,
      );
    }
    expect(getProduct("no-existe")).toBeNull();
  });

  it("getMerchant del mock responde para todos los comercios del directorio", async () => {
    const c = createMockCuotas();
    for (const m of MERCHANTS) {
      const merchant = await c.getMerchant(m.address);
      expect(merchant.name).toBe(m.name);
      expect(merchant.active).toBe(true);
      expect(merchant.settlementBalance).toBe(0);
      expect(merchant.sales).toEqual([]);
    }
  });

  it("se puede comprar en cualquier comercio y la venta se le atribuye", async () => {
    const c = createMockCuotas();
    const otro = MERCHANTS.find((m) => m.address !== DEMO_MERCHANT)!;
    const producto = otro.products[0];
    const res = await c.openPlan({
      student: "WalletCompradora1111111111111111111111111",
      merchant: otro.address,
      price: producto.price,
      productId: producto.id,
    });
    expect(res.value.merchant).toBe(otro.address);
    const merchant = await c.getMerchant(otro.address);
    expect(merchant.sales).toHaveLength(1);
    expect(merchant.sales[0].planId).toBe(res.value.id);
    // Voltia no se entera de la venta.
    expect((await c.getMerchant(DEMO_MERCHANT)).sales).toEqual([]);
  });
});

describe("búsqueda del directorio", () => {
  it("normaliza tildes y mayúsculas", () => {
    expect(normalizeSearch("Electrónica")).toBe("electronica");
    expect(normalizeSearch("  CÓDIGO ")).toBe("  codigo ");
  });

  it("encuentra por nombre sin importar tildes ni mayúsculas", () => {
    const res = searchMerchants({ q: "FERRETERÍA" });
    expect(res.map((m) => m.name)).toContain("Ferretería La Tuerca");
    expect(searchMerchants({ q: "ferreteria" }).map((m) => m.name)).toContain(
      "Ferretería La Tuerca",
    );
  });

  it("busca por categoría en ambos idiomas", () => {
    for (const m of searchMerchants({ q: "electronica" })) {
      expect(m.category).toBe("electronics");
    }
    for (const m of searchMerchants({ q: "technical service" })) {
      expect(m.category).toBe("service");
    }
  });

  it("busca dentro de los nombres de productos", () => {
    const res = searchMerchants({ q: "taladro" });
    expect(res.map((m) => m.name)).toEqual(["Herramientas del Valle"]);
  });

  it("combina texto y categoría", () => {
    const res = searchMerchants({ q: "curso", categoryId: "courses" });
    expect(res.map((m) => m.name)).toEqual(["Academia Código Sur"]);
    // "curso" también existe en Voltia (producto), pero no es de la categoría.
    const todos = searchMerchants({ q: "curso" });
    expect(todos.map((m) => m.name)).toContain("Voltia");
    expect(todos.map((m) => m.name)).toContain("Academia Código Sur");
  });

  it("devuelve vacío sin resultados", () => {
    expect(searchMerchants({ q: "comercio inexistente xyz" })).toEqual([]);
    expect(searchMerchants({ categoryId: "service" as CategoryId, q: "taladro" })).toEqual([]);
  });

  it("sin filtros devuelve todo el directorio", () => {
    expect(searchMerchants()).toHaveLength(MERCHANTS.length);
    expect(searchMerchants({ q: "   " })).toHaveLength(MERCHANTS.length);
  });

  it("destacados primero y después alfabético, con orden estable", () => {
    const res = searchMerchants();
    const featuredCount = MERCHANTS.filter((m) => m.featured).length;
    expect(featuredCount).toBeGreaterThanOrEqual(3);
    expect(featuredCount).toBeLessThanOrEqual(4);
    expect(res.slice(0, featuredCount).every((m) => m.featured)).toBe(true);
    expect(res.slice(featuredCount).every((m) => !m.featured)).toBe(true);

    const names = res.map((m) => m.name);
    const featuredNames = names.slice(0, featuredCount);
    const restNames = names.slice(featuredCount);
    const collator = new Intl.Collator("es", { sensitivity: "base" });
    expect(featuredNames).toEqual([...featuredNames].sort(collator.compare));
    expect(restNames).toEqual([...restNames].sort(collator.compare));

    // El orden es determinista: la misma consulta da el mismo resultado.
    expect(searchMerchants().map((m) => m.address)).toEqual(res.map((m) => m.address));
  });

  it("featuredMerchants devuelve solo destacados", () => {
    const featured = featuredMerchants();
    expect(featured.length).toBeGreaterThanOrEqual(3);
    expect(featured.every((m) => m.featured)).toBe(true);
    expect(featured.map((m) => m.name)).toContain("Voltia");
  });

  it("getCategory devuelve etiquetas en ambos idiomas", () => {
    expect(getCategory("electronics")?.label.en).toBe("Electronics and computing");
    expect(getCategory("no-existe")).toBeNull();
  });
});
