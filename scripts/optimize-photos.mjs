/**
 * Normaliza las fotos de public/img/productos para que todas se vean iguales:
 *  1. Quita el fondo claro (blanco o gris) que rodea al producto (relleno desde los bordes).
 *  2. Recorta al contorno del producto.
 *  3. Lo centra en un lienzo cuadrado transparente de 1200 px con el mismo margen.
 * El fondo visible lo pone la tienda (token --photo). Guarda WebP y escribe
 * src/data/product-photos.generated.json. El nombre del archivo es el id del producto.
 * Uso: node scripts/optimize-photos.mjs
 */
import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public/img/productos");
const SIZE = 1200;
const CONTENT = Math.round(SIZE * 0.86); // margen uniforme alrededor del producto

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const isLightNeutral = (d, i) => {
  const max = Math.max(d[i], d[i + 1], d[i + 2]);
  const min = Math.min(d[i], d[i + 1], d[i + 2]);
  return lum(d, i) > 170 && max - min < 28;
};

async function normalize(input) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const at = (x, y) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const alreadyTransparent = corners.every((i) => data[i + 3] < 16);

  if (!alreadyTransparent) {
    // Relleno desde los bordes por píxeles claros y suaves: el fondo, no el producto.
    const bg = new Uint8Array(w * h);
    const stack = [];
    const seed = (x, y) => {
      const p = y * w + x;
      if (!bg[p] && isLightNeutral(data, p * 4)) { bg[p] = 1; stack.push(p); }
    };
    for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
    for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      const l = lum(data, p * 4);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (bg[q] || !isLightNeutral(data, q * 4) || Math.abs(lum(data, q * 4) - l) > 9) continue;
        bg[q] = 1;
        stack.push(q);
      }
    }
    for (let p = 0; p < w * h; p++) if (bg[p]) data[p * 4 + 3] = 0;
    // Suaviza el borde: píxeles claros pegados al fondo quedan semitransparentes (sin halo blanco).
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (bg[p] || lum(data, p * 4) < 200) continue;
      if (bg[p - 1] || bg[p + 1] || bg[p - w] || bg[p + w]) data[p * 4 + 3] = 110;
    }
  }

  // Contorno del producto.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[at(x, y) + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new Error("imagen vacía tras quitar el fondo");

  const fitted = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize({ width: CONTENT, height: CONTENT, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const { width: fw, height: fh } = fitted.info;
  const left = Math.floor((SIZE - fw) / 2), top = Math.floor((SIZE - fh) / 2);
  return sharp(fitted.data)
    .extend({ left, top, right: SIZE - fw - left, bottom: SIZE - fh - top, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 84, alphaQuality: 90 })
    .toBuffer();
}

// Los archivos ya procesados se llaman <id>.<huella>.webp; la huella cambia con el
// contenido, así navegador y Next.js nunca sirven una versión anterior en caché.
const PROCESSED = /^(.+)\.([0-9a-f]{8})\.webp$/;
const index = {};
for (const file of (await readdir(DIR)).sort()) {
  const done = file.match(PROCESSED);
  if (done) {
    index[done[1]] = { src: `/img/productos/${file}`, width: SIZE, height: SIZE };
    continue;
  }
  const src = path.join(DIR, file);
  const id = path.parse(file).name;
  // Se lee a memoria para no mantener el archivo abierto (Windows lo bloquea).
  const out = await normalize(await readFile(src));
  const hash = createHash("sha256").update(out).digest("hex").slice(0, 8);
  for (const old of await readdir(DIR)) if (old.startsWith(`${id}.`) && PROCESSED.test(old)) await rm(path.join(DIR, old));
  await rm(src);
  await writeFile(path.join(DIR, `${id}.${hash}.webp`), out);
  index[id] = { src: `/img/productos/${id}.${hash}.webp`, width: SIZE, height: SIZE };
  console.log(`${id}\t${Math.round(out.length / 1024)} KB`);
}

await writeFile(path.join(ROOT, "src/data/product-photos.generated.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`${Object.keys(index).length} fotos normalizadas.`);
