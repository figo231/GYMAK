import { describe, it, expect } from "vitest";
import { validBarcode, parseProduct, itemFor, lookupBarcode } from "../src/lib/barcode";
const ok = { status: 1, product: { product_name: "Biscuit", brands: "Brand A, B", nutriments: { "energy-kcal_100g": 480, proteins_100g: 6.25, carbohydrates_100g: 70, fat_100g: 19 }, serving_quantity: "40" } };
describe("barcode", () => {
  it("checksum", () => {
    expect(validBarcode("5449000000996")).toBe("5449000000996");
    expect(validBarcode("5449000000997")).toBeNull();
    expect(validBarcode("96385074")).toBe("96385074");
    expect(validBarcode("123")).toBeNull();
    expect(validBarcode("abcdefghijklm")).toBeNull();
  });
  it("parses products, falls back to kJ, rejects incomplete", () => {
    const p = parseProduct(ok);
    expect(p).toMatchObject({ name: "Biscuit", brand: "Brand A", serving: 40, per100: { kcal: 480, protein: 6.3 } });
    expect(parseProduct({ status: 1, product: { product_name: "X", nutriments: { energy_100g: 418.4 } } }).per100.kcal).toBe(100);
    expect(parseProduct({ status: 0 })).toBeNull();
    expect(parseProduct({ status: 1, product: { product_name: "X", nutriments: {} } })).toBeNull();
    expect(parseProduct({ status: 1, product: { nutriments: { "energy-kcal_100g": 1 } } })).toBeNull();
  });
  it("scales by grams and rejects bad grams", () => {
    const it = itemFor(parseProduct(ok), 40);
    expect(it).toMatchObject({ grams: 40, kcal: 192, carbs: 28, fat: 7.6 });
    expect(itemFor(parseProduct(ok), 0)).toBeNull();
    expect(itemFor(parseProduct(ok), 99999)).toBeNull();
  });
  it("lookup handles ok, 404 and network failure", async () => {
    expect((await lookupBarcode("5449000000996", async () => ({ ok: true, json: async () => ok }))).ok).toBe(true);
    expect((await lookupBarcode("5449000000996", async () => ({ ok: true, json: async () => ({ status: 0 }) }))).error).toBe("notfound");
    expect((await lookupBarcode("5449000000996", async () => { throw new Error("x"); })).error).toBe("network");
    expect((await lookupBarcode("1234567890123", async () => ({}))).error).toBe("invalid");
  });
});
