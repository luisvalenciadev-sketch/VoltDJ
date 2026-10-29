/**
 * Descarga la foto principal de la galería oficial de cada modelo (sitios de
 * Pioneer DJ y AlphaTheta) a public/img/productos/<id-producto>.<ext>.
 * Uso: node scripts/fetch-official-photos.mjs [id-producto ...]
 * Las fotos tienen derechos del fabricante: se usan para vender el producto original.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };
const OUT = path.resolve(import.meta.dirname, "../public/img/productos");
const PDJ = "https://www.pioneerdj.com";

/** id de producto → página oficial (Pioneer DJ) o URL directa de imagen (AlphaTheta). */
const PIONEER = {
  "pioneer-dj-cdj-3000": "dj-players-turntables/cdj-3000",
  "pioneer-dj-opus-quad": "all-in-one-dj-systems/opus-quad",
  "pioneer-dj-xdj-rx3": "all-in-one-dj-systems/xdj-rx3",
  "pioneer-dj-xdj-xz": "all-in-one-dj-systems/xdj-xz",
  "pioneer-dj-xdj-rx2-edicion-limitada": "all-in-one-dj-systems/xdj-rx2-w",
  "pioneer-dj-xdj-rx2": "all-in-one-dj-systems/xdj-rx2",
  "pioneer-dj-xdj-rr": "all-in-one-dj-systems/xdj-rr",
  "pioneer-dj-xdj-rx": "all-in-one-dj-systems/xdj-rx",
  "pioneer-dj-ddj-flx10": "dj-controllers/ddj-flx10",
  "pioneer-dj-ddj-rx": "dj-controllers/ddj-rx",
  "pioneer-dj-ddj-flx6-gt": "dj-controllers/ddj-flx6-gt",
  "pioneer-dj-ddj-1000": "dj-controllers/ddj-1000",
  "pioneer-dj-ddj-flx6-w": "dj-controllers/ddj-flx6-w",
  "pioneer-dj-ddj-flx6-black": "dj-controllers/ddj-flx6",
  "pioneer-dj-ddj-flx4-n": "dj-controllers/ddj-flx4-n",
  "pioneer-dj-ddj-flx4-w": "dj-controllers/ddj-flx4-w",
  "pioneer-dj-ddj-flx4": "dj-controllers/ddj-flx4",
  "pioneer-dj-ddj-400": "dj-controllers/ddj-400",
  "pioneer-dj-rmx-1000": "dj-effectors/rmx-1000",
};
const ALPHATHETA = {
  "pioneer-dj-xdj-az": "https://assets.alphatheta.com/wp-content/uploads/2024/09/XDJ-AZ_CGI_Angle_3300x2034-scaled.webp",
  "alphatheta-omnis-duo": "https://assets.alphatheta.com/wp-content/uploads/2024/01/OMNIS-DUO-CGI-angle-3500x2994-1-scaled.webp",
  "pioneer-dj-ddj-flx2": "https://assets.alphatheta.com/wp-content/uploads/2024/10/ddj-flx2-black-main.webp",
};

const only = process.argv.slice(2);
const want = (id) => !only.length || only.includes(id);
await mkdir(OUT, { recursive: true });

async function save(id, url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const ext = path.extname(new URL(url).pathname) || ".jpg";
  await writeFile(path.join(OUT, id + ext), Buffer.from(await r.arrayBuffer()));
  console.log(`✓ ${id}${ext}`);
}

for (const [id, page] of Object.entries(PIONEER)) {
  if (!want(id)) continue;
  const html = await (await fetch(`${PDJ}/en/product/${page}/`, { headers: UA })).text();
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const first = json && JSON.parse(json).props.pageProps.data?.detail?.top?.productImages?.[0];
  if (!first) {
    console.warn(`✗ ${id}: sin galería en ${page}`);
    continue;
  }
  await save(id, PDJ + first);
}
for (const [id, url] of Object.entries(ALPHATHETA)) if (want(id)) await save(id, url);
