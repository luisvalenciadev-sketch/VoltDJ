/**
 * Convierte las fotos de public/img/productos a WebP (máx. 1200 px, calidad 82),
 * elimina los originales pesados y escribe src/data/product-photos.generated.json
 * con ruta y dimensiones de cada foto. El nombre del archivo es el id del producto.
 * Uso: node scripts/optimize-photos.mjs
 */
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public/img/productos");
const index = {};

for (const file of (await readdir(DIR)).sort()) {
  const src = path.join(DIR, file);
  const id = path.parse(file).name;
  // Se lee a memoria para no mantener el archivo abierto (Windows lo bloquea).
  const input = await readFile(src);
  const meta = await sharp(input).metadata();
  let width = meta.width;
  let height = meta.height;
  if (!file.endsWith(".webp") || width > 1200 || height > 1200) {
    const { data, info } = await sharp(input)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    await rm(src);
    await writeFile(path.join(DIR, `${id}.webp`), data);
    ({ width, height } = info);
    console.log(`optimizada ${id}\t${width}x${height}\t${Math.round(data.length / 1024)} KB`);
  }
  index[id] = { src: `/img/productos/${id}.webp`, width, height };
}

await writeFile(path.join(ROOT, "src/data/product-photos.generated.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`${Object.keys(index).length} fotos registradas.`);
