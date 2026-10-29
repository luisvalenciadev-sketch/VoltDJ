import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { SEED_PRODUCTS } from "@/data/products";
import { exportCatalogCsv, htmlToText, parseImport, parseMoney, planImport, templateCsv, type ImportRow } from "./catalog-import";
import { parseCsv, toCsv } from "./csv";

const current = { products: SEED_PRODUCTS, categories: CATEGORIES, brands: BRANDS };
const parsed = (text: string) => {
  const r = parseImport(text);
  if ("error" in r) throw new Error(r.error);
  return r;
};

describe("CSV", () => {
  it("lee separador ; con BOM, comillas escapadas y saltos dentro de comillas", () => {
    const rows = parseCsv('﻿a;b\r\n"x;1";"dijo ""hola""\notra línea"\r\n\r\n');
    expect(rows).toEqual([["a", "b"], ["x;1", 'dijo "hola"\notra línea']]);
  });
  it("lee separador , como lo exporta WooCommerce", () => {
    expect(parseCsv("SKU,Name\nA1,\"Cabina, 15\"\"\"")).toEqual([["SKU", "Name"], ["A1", 'Cabina, 15"']]);
  });
  it("escribe lo que vuelve a leer igual", () => {
    const csv = toCsv(["a", "b"], [["1;2", 'con "comillas"'], [null, 3]]);
    expect(parseCsv(csv)).toEqual([["a", "b"], ["1;2", 'con "comillas"'], ["", "3"]]);
  });
});

describe("valores", () => {
  it("entiende precios escritos de varias formas", () => {
    expect(parseMoney("$ 1.250.000")).toBe(1250000);
    expect(parseMoney("1,250,000")).toBe(1250000);
    expect(parseMoney("610000.00")).toBe(610000);
    expect(parseMoney("")).toBeUndefined();
    expect(parseMoney("gratis")).toBeNaN();
  });
  it("limpia el HTML de las descripciones de WooCommerce", () => {
    expect(htmlToText("<p>Cabina&nbsp;activa</p><ul><li>15&quot;</li><li>1000 W</li></ul>")).toBe('Cabina activa\n• 15"\n• 1000 W');
  });
});

describe("plantilla propia", () => {
  it("la plantilla descargable se reconoce y su fila de ejemplo es válida", () => {
    const { format, rows } = parsed(templateCsv());
    expect(format).toBe("plantilla");
    const plan = planImport(format, rows, current);
    expect(plan.rows[0].errors).toEqual([]);
    expect(plan.rows[0].action).toBe("crear");
    expect(plan.newBrands).toEqual(["PRO DJ"]);
  });

  it("actualiza por SKU y solo toca las columnas que vienen llenas", () => {
    const text = "sku;nombre;precio;stock\nDDJ-FLX4;;1250000;3\n";
    const { format, rows } = parsed(text);
    const row = planImport(format, rows, current).rows[0];
    expect(row).toMatchObject({ action: "actualizar", productId: "pioneer-dj-ddj-flx4", price: 1250000, stock: 3 });
    expect(row.name).toBeUndefined();
  });

  it("marca errores por fila sin detener las demás", () => {
    const text = "sku;nombre;precio;estado\nA1;Uno;abc;publicado\nA2;Dos;100000;vendido\nA1;Uno otra vez;100000;\nA3;Tres;200000;borrador\n";
    const { format, rows } = parsed(text);
    const plan = planImport(format, rows, current);
    expect(plan.rows.map((r) => r.errors.length > 0)).toEqual([true, true, true, false]);
    expect(plan.rows[2].errors[0]).toContain("repetido");
    expect(plan.counts).toMatchObject({ crear: 1, errores: 3 });
  });

  it("la exportación se vuelve a importar como actualizaciones sin errores", () => {
    const csv = exportCatalogCsv(current, "https://tienda.test");
    const { format, rows } = parsed(csv);
    const plan = planImport(format, rows, current);
    expect(plan.counts).toMatchObject({ actualizar: SEED_PRODUCTS.length, crear: 0, errores: 0, fotos: 0 });
  });

  it("rechaza archivos que no son de ningún formato conocido", () => {
    expect(parseImport("columna;otra\n1;2")).toEqual({ error: expect.stringContaining("No reconocemos el formato") });
  });
});

describe("WooCommerce", () => {
  const woo = [
    "ID,Type,SKU,Name,Published,Is featured?,Short description,Description,In stock?,Stock,Backorders allowed?,Sale price,Regular price,Categories,Images,Parent,Attribute 1 name,Attribute 1 value(s)",
    '101,simple,MX8DLED,Cabina Maxlin MX8DLED,1,0,"<p>Cabina doble 2x8&quot; con luces</p>",,1,4,0,600000,700000,"Audio > Cabinas activas","https://tienda-vieja.test/a.jpg, https://tienda-vieja.test/b.jpg",,Marca,Maxlin',
    "102,variable,FLX4,Controlador FLX4,1,1,,<p>Controlador de 2 canales</p>,1,,0,,,Controladores DJ,https://tienda-vieja.test/flx4.jpg,,Marca,Pioneer DJ",
    "103,variation,FLX4-W,Controlador FLX4 - Blanco,1,0,,,1,2,0,,1470000,,,id:102,,",
    "104,simple,,Base para micrófono,0,0,,,0,,0,,35000,Accesorios,,,,",
  ].join("\n");

  it("reconoce el formato y convierte cada tipo de producto", () => {
    const { format, rows } = parsed(woo);
    expect(format).toBe("woocommerce");
    const [cabina, padre, variacion, base] = rows;
    expect(cabina).toMatchObject({ sku: "MX8DLED", price: 700000, salePrice: 600000, stock: 4, status: "published", category: "Cabinas activas", brand: "Maxlin", description: 'Cabina doble 2x8" con luces' });
    expect(cabina.imageUrls).toHaveLength(2);
    expect(padre.skip).toBe(true);
    // La variación hereda del padre la categoría, la marca, la descripción y la foto.
    expect(variacion).toMatchObject({ sku: "FLX4-W", price: 1470000, stock: 2, category: "Controladores DJ", brand: "Pioneer DJ", description: "Controlador de 2 canales" });
    expect(variacion.imageUrls).toEqual(["https://tienda-vieja.test/flx4.jpg"]);
    expect(base).toMatchObject({ status: "draft", stock: 0 });
  });

  it("planea crear con marca por defecto y cuenta las fotos a descargar", () => {
    const { format, rows } = parsed(woo);
    const plan = planImport(format, rows, current);
    expect(plan.counts).toMatchObject({ crear: 3, omitir: 1, errores: 0, fotos: 3 });
    expect(plan.newBrands.sort()).toEqual(["Maxlin", "Otras marcas"]);
    expect(plan.newCategories.sort()).toEqual(["Accesorios", "Cabinas activas", "Controladores DJ"]);
  });

  it("lee la exportación en español", () => {
    const es = "ID,Tipo,SKU,Nombre,Publicado,Precio rebajado,Precio normal,Categorías,Imágenes,¿En inventario?,Inventario\n1,simple,P1,Parlante 18\",1,,610000,Parlantes de graves,,1,5\n";
    const { format, rows } = parsed(es);
    expect(format).toBe("woocommerce");
    expect(rows[0] as ImportRow).toMatchObject({ name: 'Parlante 18"', price: 610000, stock: 5, category: "Parlantes de graves" });
  });
});
