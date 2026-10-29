/**
 * Descarga fotos de Pexels (licencia Pexels: uso comercial gratuito) a public/img
 * y escribe src/data/images.generated.json con rutas, dimensiones y créditos.
 *
 * Uso: node --env-file=.env.local scripts/fetch-images.mjs
 * Requiere PEXELS_API_KEY. La clave solo se usa aquí, nunca en el navegador.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error("Falta PEXELS_API_KEY (agrégala en .env.local).");
  process.exit(1);
}

const ROOT = path.resolve(import.meta.dirname, "..");

/** clave → búsqueda, orientación y tamaño de recorte. `id` fija una foto elegida a mano. */
const JOBS = {
  "hero": { q: "dj controller hands", orientation: "landscape", w: 1600, h: 1200 },
  "cat/controladores": { q: "dj controller", orientation: "landscape", w: 960, h: 600 },
  "cat/mezcladores": { q: "dj mixer knobs", orientation: "landscape", w: 960, h: 600 },
  "cat/reproductores": { q: "turntable vinyl record", orientation: "landscape", w: 960, h: 600 },
  "cat/parlantes": { q: "speakers on stage", orientation: "landscape", w: 960, h: 600 },
  "cat/audifonos": { q: "dj headphones", orientation: "landscape", w: 960, h: 600 },
  "cat/microfonos": { q: "microphone stage", orientation: "landscape", w: 960, h: 600 },
  "cat/iluminacion": { q: "stage lights concert", orientation: "landscape", w: 960, h: 600 },
  "cat/accesorios": { q: "audio cables", orientation: "landscape", w: 960, h: 600 },
  "p/p01": { q: "dj controller", orientation: "square", w: 900, h: 900 },
  "p/p02": { q: "dj controller screen", orientation: "square", w: 900, h: 900 },
  "p/p03": { q: "audio mixer", orientation: "square", w: 900, h: 900 },
  "p/p04": { q: "turntable", orientation: "square", w: 900, h: 900 },
  "p/p05": { q: "dj booth", orientation: "square", w: 900, h: 900 },
  "p/p06": { q: "pa speaker", id: 34585133, orientation: "square", w: 900, h: 900 },
  "p/p07": { q: "studio monitor speakers", orientation: "square", w: 900, h: 900 },
  "p/p08": { q: "black headphones", orientation: "square", w: 900, h: 900 },
  "p/p09": { q: "microphone", orientation: "square", w: 900, h: 900 },
  "p/p10": { q: "led stage spotlight", orientation: "square", w: 900, h: 900 },
  "p/p11": { q: "equipment case", orientation: "square", w: 900, h: 900 },
  "p/p12": { q: "rca cable", id: 12997214, orientation: "square", w: 900, h: 900 },
  "p/p13": { q: "turntable needle", orientation: "square", w: 900, h: 900 },
  "p/p14": { q: "laptop stand desk", orientation: "square", w: 900, h: 900 },
};

// Con argumentos se regeneran solo esas claves: node ... scripts/fetch-images.mjs p/p02 p/p10
const only = process.argv.slice(2);
const JSON_PATH = path.join(ROOT, "src/data/images.generated.json");
const out = only.length ? JSON.parse(await readFile(JSON_PATH, "utf8").catch(() => "{}")) : {};
const photoId = (v) => v.id ?? Number(v.credit?.source?.match(/-(\d+)\/?$/)?.[1]);
const used = new Set(Object.entries(out).filter(([k]) => !only.includes(k)).map(([, v]) => photoId(v)));

for (const [key, job] of Object.entries(JOBS)) {
  if (only.length && !only.includes(key)) continue;
  const url = job.id
    ? `https://api.pexels.com/v1/photos/${job.id}`
    : `https://api.pexels.com/v1/search?query=${encodeURIComponent(job.q)}&orientation=${job.orientation}&per_page=15`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status} en "${job.q}"`);
  const body = await res.json();
  const photo = job.id ? body : body.photos.find((p) => !used.has(p.id));
  if (!photo) {
    console.warn(`Sin resultados para "${job.q}"; se mantiene la ilustración.`);
    continue;
  }
  used.add(photo.id);

  const imgUrl = `${photo.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=${job.w}&h=${job.h}`;
  const img = await fetch(imgUrl);
  if (!img.ok) throw new Error(`Descarga ${img.status}: ${imgUrl}`);
  const file = `img/${key}.jpg`;
  await mkdir(path.join(ROOT, "public", path.dirname(file)), { recursive: true });
  await writeFile(path.join(ROOT, "public", file), Buffer.from(await img.arrayBuffer()));

  out[key] = {
    id: photo.id,
    src: `/${file}`,
    alt: photo.alt || job.q,
    width: job.w,
    height: job.h,
    credit: { name: photo.photographer, url: photo.photographer_url, source: photo.url },
  };
  console.log(`✓ ${key} ← ${photo.photographer} (${photo.id})`);
}

await writeFile(JSON_PATH, JSON.stringify(out, null, 2) + "\n");
console.log(`\n${Object.keys(out).length} imágenes guardadas.`);
