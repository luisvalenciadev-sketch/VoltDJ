# VOLT DJ â€” Tienda de equipos DJ

Tienda con catÃ¡logo, carrito y cierre de ventas por WhatsApp. Next.js 16 + TypeScript, sin pagos en lÃ­nea.

> **Estado:** MVP funcional con **catÃ¡logo de demostraciÃ³n** (marcas "Marca Aâ€“F", SKU `DEMO-*`, precios ficticios).
> Los textos marcados con `âŸ¨ âŸ©` en la interfaz son datos comerciales pendientes de la tienda.

## Requisitos

- Node.js 20 o superior (probado con 22.14)
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completar
npm run dev                  # http://localhost:3000
```

## ConfiguraciÃ³n

### NÃºmero de WhatsApp

Se edita en el panel (`/admin/configuracion`). La variable de entorno es solo el valor inicial, mientras la tienda no guarde otro:

```
NEXT_PUBLIC_WHATSAPP_NUMBER=57XXXXXXXXXX   # solo dÃ­gitos, con indicativo de paÃ­s, sin "+"
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

- Si el nÃºmero falta o es invÃ¡lido, la tienda **no inventa uno**: oculta los accesos rÃ¡pidos a WhatsApp y deshabilita el botÃ³n de envÃ­o del pedido con un aviso.
- Las variables `NEXT_PUBLIC_*` se incrustan al compilar. **DespuÃ©s de cambiarlas hay que volver a ejecutar `npm run build`.** El nÃºmero guardado en el panel no necesita recompilar.

### Datos de la tienda

Se editan en el panel, en **ConfiguraciÃ³n** (`/admin/configuracion`), y se guardan en Neon (tabla `settings`):

- **Tienda:** nombre, eslogan, descripciÃ³n, WhatsApp de pedidos, telÃ©fono, correo, direcciÃ³n, horario, razÃ³n social, NIT, prefijo de pedidos, cinta superior y redes.
- **Marca:** logo para fondo oscuro y para fondo claro, Ã­cono de la pestaÃ±a y color de acento. El color debe tener contraste de 4,5:1 con el fondo; si no lo tiene, el panel sugiere el mismo tono mÃ¡s claro. El texto de los botones (oscuro o blanco) se elige solo.
- **PolÃ­ticas:** envÃ­os, garantÃ­a, cambios, medios de pago y el texto de privacidad y de tÃ©rminos, con vista previa. Formato: `## ` para subtÃ­tulos, `- ` para listas, lÃ­nea en blanco entre pÃ¡rrafos.
- **SEO:** tÃ­tulo y descripciÃ³n para Google e imagen para compartir el enlace.

`src/config/store.ts` guarda solo los valores iniciales (`initialStore`, o `blankStore` con `CATALOG_SEED=none`) y lo que no cambia desde el panel (`SITE`: URL, idioma y moneda). Un valor vacÃ­o se muestra como "pendiente".

Las preguntas frecuentes estÃ¡n en `src/config/content.ts`.

### Fotos de referencia (Pexels)

Las fotos de `public/img` se descargaron de Pexels (licencia de uso comercial gratuito) con:

```bash
node --env-file=.env.local scripts/fetch-images.mjs            # todas
node --env-file=.env.local scripts/fetch-images.mjs p/p06 hero # solo algunas
```

Requiere `PEXELS_API_KEY` en `.env.local`. La clave solo la usa el script: nunca llega al navegador ni al repositorio. Las bÃºsquedas estÃ¡n en `JOBS` dentro del script; con `id` se fija una foto elegida a mano.

Son **fotos de referencia, no del producto exacto**: la tienda lo indica junto a cada foto, con crÃ©dito al fotÃ³grafo y enlace a Pexels. Algunas muestran logos de marcas reales. Antes de vender, reemplÃ¡zalas por fotos del producto real (campo `images` del producto).

### Fotos de producto

Las fotos estÃ¡n en `public/img/productos/<id-del-producto>.webp`. Para cambiar o agregar una:

1. Copia la imagen (jpg, png o webp) a `public/img/productos/` con el id del producto como nombre (p. ej. `pioneer-dj-cdj-3000.jpg`; el id estÃ¡ en la URL de la ficha).
2. Ejecuta `node scripts/optimize-photos.mjs`: la convierte a WebP de 1200 px y la registra.

`scripts/fetch-official-photos.mjs` vuelve a descargar las fotos oficiales de Pioneer DJ y AlphaTheta. Son imÃ¡genes del fabricante, usadas para vender el producto original; si el fabricante o un distribuidor pide retirarlas, basta con reemplazar el archivo.

### Identidad visual

La tienda elige uno de cinco temas en **ConfiguraciÃ³n â†’ DiseÃ±o**: Escenario (oscuro, el original), Vitrina, Estudio, Bodega y Barrio. Comparten datos, lÃ³gica y componentes; cambia la presentaciÃ³n.

- `src/config/themes.ts`: colores, familias, radios y densidad de cada tema. El layout genera con ellos las variables CSS por `[data-theme]`. Las pruebas verifican el contraste de cada tema (`themes.test.ts`).
- `src/styles/themes.css`: lo que cambia de forma (hÃ©roe sin 3D, tarjetas en caja, filas densasâ€¦).
- `src/styles/tokens.css`: escala tipogrÃ¡fica, espaciado y movimiento compartidos.
- `src/app/fonts.ts`: dos familias por tema. Solo se precargan las de Escenario.
- El color de acento de la tienda se aplica en cualquier tema, aclarado u oscurecido lo justo para leerse sobre su fondo.
- **Vista previa:** `/?tema=vitrina` muestra la tienda con otro tema solo en esa pestaÃ±a, tambiÃ©n al navegar; `?tema=salir` la quita. El panel siempre usa Escenario.

### CatÃ¡logo

El catÃ¡logo se administra en el panel: `/admin/productos`, `/admin/inventario`, `/admin/categorias`, `/admin/marcas` e `/admin/importar` (CSV propio o exportaciÃ³n de WooCommerce). Se guarda en Neon y las fotos en Vercel Blob. El plan completo estÃ¡ en `docs/plan-panel-admin.md`.

| Archivo | Contenido |
|---|---|
| `src/data/types.ts` | Modelo de producto (`ProductRecord` en el panel, `Product` en la tienda), categorÃ­a y marca |
| `src/data/products.ts` / `categories.ts` / `brands.ts` | **CatÃ¡logo inicial**: se copia a la base la primera vez y se usa en las pruebas |
| `src/data/products.demo.ts` | Productos ficticios, solo para pruebas |
| `src/data/catalog.ts` | Repositorio de la tienda: lee con cachÃ© por etiqueta (`catalog`) que el panel invalida al guardar |
| `src/lib/catalog-store.ts` | AlmacÃ©n: Neon, memoria (pruebas) o solo lectura (sin base) |
| `src/lib/db.ts` | Esquema y migraciones: se aplican solas en la primera peticiÃ³n |
| `src/lib/inventory.ts` | Disponibilidad calculada desde el stock y promociÃ³n aplicada |
| `src/lib/catalog-import.ts` | ImportaciÃ³n y exportaciÃ³n CSV, plantilla y WooCommerce |
| `src/data/store.ts` / `src/lib/settings-store.ts` | Datos de la tienda: cachÃ© con la etiqueta `settings` y almacÃ©n (Neon, memoria o solo lectura) |

Reglas de los datos:
- Precio vacÃ­o muestra "Precio por confirmar" y no suma al subtotal.
- El precio rebajado propio debe ser menor que el precio. Las promociones (`/admin/promociones`) se aplican por tienda, categorÃ­a o producto, con fechas en hora de Colombia; a un producto le toca la mayor vigente, y si ademÃ¡s tiene precio rebajado propio la tienda muestra el mÃ¡s bajo (`src/lib/promotions.ts`).
- Medios de pago y cuotas (`ConfiguraciÃ³n â†’ Pagos`): la ficha muestra "Desde $X al mes" con la cuota mÃ¡s baja de los medios a cuotas activos, redondeada al millar hacia arriba y sin intereses (referencia sujeta a aprobaciÃ³n).
- EnvÃ­os (`ConfiguraciÃ³n â†’ EnvÃ­os`): zonas con tiempo y costo (vacÃ­o = se cotiza, 0 = gratis) y despacho el mismo dÃ­a con hora de corte. El cliente elige su zona al enviar el pedido y llega en el mensaje.
- Una guÃ­a con productos del catÃ¡logo aparta sus unidades del inventario al crearla o editarla y las devuelve al cancelarla o eliminarla (`src/lib/order-stock.ts`, `src/lib/guide-stock.ts`). Nunca bloquea: si no alcanza, aparta lo que hay y avisa. Los productos sin control de inventario no se tocan.
- La disponibilidad sale del stock: sin control de inventario â†’ Disponible; 0 â†’ Agotado (o Bajo pedido si se permite); hasta el umbral â†’ Pocas unidades. Los agotados no se pueden aÃ±adir al carrito y nadie puede pedir mÃ¡s unidades de las que hay.
- Borrador o archivado despublica el producto. Una categorÃ­a o marca oculta oculta tambiÃ©n sus productos.

## Arquitectura

```
src/
  app/          Rutas (pÃ¡ginas, metadatos SEO, sitemap, robots)
  components/   PresentaciÃ³n
  config/       ConfiguraciÃ³n comercial y textos
  data/         Modelo y acceso a datos (repositorio)
  lib/          LÃ³gica de negocio pura: precios, carrito, filtros, WhatsApp
  store/        Estado cliente: carrito persistente y avisos
  styles/       Tokens de diseÃ±o
```

- **Carrito:** guarda en `localStorage` solo `{id, qty, seenPrice}`. Precio, promociÃ³n y disponibilidad se recalculan siempre contra el catÃ¡logo. Se avisan precios cambiados, productos retirados o agotados y cantidades por encima del mÃ¡ximo. Se sincroniza entre pestaÃ±as.
- **El precio del navegador no es una fuente confiable.** Si en el futuro se aÃ±aden pagos en lÃ­nea, el servidor debe recalcular el total desde el catÃ¡logo antes de cobrar.
- **WhatsApp** (`src/lib/whatsapp.ts`): construye el mensaje y el enlace `https://wa.me/{nÃºmero}?text={encodeURIComponent(mensaje)}`. El mensaje incluye tienda, ID provisional, productos, referencias, cantidades, precios, subtotal y consulta de envÃ­o. No incluye datos personales: la ciudad es opcional y se limpia. Tras abrir WhatsApp la tienda nunca dice "pedido recibido".
- **Filtros** en la URL (`?q=&marca=&disponibilidad=&promo=1&min=&max=&orden=`), renderizados en el servidor; las URL se pueden compartir.

## Pruebas

```bash
npm run typecheck
npm test            # Vitest: lÃ³gica, componentes y contraste de los temas (200 pruebas)
npm run test:e2e    # Playwright: escritorio, tablet, mÃ³vil, los cinco temas, panel de catÃ¡logo, configuraciÃ³n y ventas (126 pruebas)
```

La primera vez, para las pruebas e2e: `npx playwright install chromium`. Usan el puerto 3217 y un nÃºmero de WhatsApp ficticio de prueba.

Las e2e cubren:
- los cuatro temas nuevos sin scroll horizontal ni errores graves de accesibilidad en inicio, catÃ¡logo, ficha y carrito, en escritorio y celular;
- el flujo completo categorÃ­a â†’ producto â†’ carrito â†’ pedido, con verificaciÃ³n del enlace `wa.me` decodificado;
- bÃºsqueda sin resultados, filtros, ofertas, producto agotado y 404;
- ausencia de scroll horizontal y de errores graves de accesibilidad (axe, WCAG 2 A/AA) en 11 pÃ¡ginas y 3 tamaÃ±os.

## Despliegue

Funciona en cualquier hosting compatible con Next.js (p. ej. Vercel) o en un servidor Node:

```bash
npm run build
npm run start   # puerto 3000 por defecto; -p para cambiarlo
```

Antes de publicar:
1. Configura `NEXT_PUBLIC_WHATSAPP_NUMBER` y `NEXT_PUBLIC_SITE_URL` en el hosting.
2. Conecta en Vercel las integraciones **Neon** (catÃ¡logo y guÃ­as) y **Blob** (fotos del panel), y define `ADMIN_PASSWORD` y `SESSION_SECRET`. Para una tienda nueva que debe arrancar vacÃ­a, define tambiÃ©n `CATALOG_SEED=none` antes del primer despliegue.
3. Completa los datos en `/admin/configuracion`, incluidos los textos legales de privacidad y tÃ©rminos aprobados por la tienda.
4. Reemplaza la ilustraciÃ³n del hero por una fotografÃ­a autorizada.

No hay credenciales en el repositorio: `.env*` estÃ¡ en `.gitignore`, salvo `.env.example`.

## DocumentaciÃ³n de diseÃ±o

- `docs/fase-1-diseno.md`: marca, sistema visual, arquitectura de informaciÃ³n, flujos, backlog y criterios.
- `design/prototipo-volt-dj.html`: prototipo navegable de la fase 1.
