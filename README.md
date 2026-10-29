# VOLT DJ — Tienda de equipos DJ

Tienda con catálogo, carrito y cierre de ventas por WhatsApp. Next.js 16 + TypeScript, sin pagos en línea.

> **Estado:** MVP funcional con **catálogo de demostración** (marcas "Marca A–F", SKU `DEMO-*`, precios ficticios).
> Los textos marcados con `⟨ ⟩` en la interfaz son datos comerciales pendientes de la tienda.

## Requisitos

- Node.js 20 o superior (probado con 22.14)
- npm

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y completar
npm run dev                  # http://localhost:3000
```

## Configuración

### Número de WhatsApp

En `.env.local` (o en las variables de entorno del hosting):

```
NEXT_PUBLIC_WHATSAPP_NUMBER=57XXXXXXXXXX   # solo dígitos, con indicativo de país, sin "+"
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

- Si el número falta o es inválido, la tienda **no inventa uno**: oculta los accesos rápidos a WhatsApp y deshabilita el botón de envío del pedido con un aviso.
- Las variables `NEXT_PUBLIC_*` se incrustan al compilar. **Después de cambiarlas hay que volver a ejecutar `npm run build`.**

### Datos de la tienda

Todos los datos comerciales están en un único archivo: `src/config/store.ts`. Ahí se definen el nombre, la promesa, la barra superior, la razón social y el NIT, el correo, la dirección, el horario, las redes, las políticas de envío y garantía, y los medios de pago. Un valor `null` se muestra como "pendiente".

Las preguntas frecuentes están en `src/config/content.ts`.

### Fotos de referencia (Pexels)

Las fotos de `public/img` se descargaron de Pexels (licencia de uso comercial gratuito) con:

```bash
node --env-file=.env.local scripts/fetch-images.mjs            # todas
node --env-file=.env.local scripts/fetch-images.mjs p/p06 hero # solo algunas
```

Requiere `PEXELS_API_KEY` en `.env.local`. La clave solo la usa el script: nunca llega al navegador ni al repositorio. Las búsquedas están en `JOBS` dentro del script; con `id` se fija una foto elegida a mano.

Son **fotos de referencia, no del producto exacto**: la tienda lo indica junto a cada foto, con crédito al fotógrafo y enlace a Pexels. Algunas muestran logos de marcas reales. Antes de vender, reemplázalas por fotos del producto real (campo `images` del producto).

### Fotos de producto

Las fotos están en `public/img/productos/<id-del-producto>.webp`. Para cambiar o agregar una:

1. Copia la imagen (jpg, png o webp) a `public/img/productos/` con el id del producto como nombre (p. ej. `pioneer-dj-cdj-3000.jpg`; el id está en la URL de la ficha).
2. Ejecuta `node scripts/optimize-photos.mjs`: la convierte a WebP de 1200 px y la registra.

`scripts/fetch-official-photos.mjs` vuelve a descargar las fotos oficiales de Pioneer DJ y AlphaTheta. Son imágenes del fabricante, usadas para vender el producto original; si el fabricante o un distribuidor pide retirarlas, basta con reemplazar el archivo.

### Identidad visual

Los colores, la tipografía, el espaciado y los radios están en `src/styles/tokens.css`. Las fuentes se cargan en `src/app/fonts.ts`.

### Catálogo

El catálogo se administra en el panel: `/admin/productos`, `/admin/inventario`, `/admin/categorias`, `/admin/marcas` e `/admin/importar` (CSV propio o exportación de WooCommerce). Se guarda en Neon y las fotos en Vercel Blob. El plan completo está en `docs/plan-panel-admin.md`.

| Archivo | Contenido |
|---|---|
| `src/data/types.ts` | Modelo de producto (`ProductRecord` en el panel, `Product` en la tienda), categoría y marca |
| `src/data/products.ts` / `categories.ts` / `brands.ts` | **Catálogo inicial**: se copia a la base la primera vez y se usa en las pruebas |
| `src/data/products.demo.ts` | Productos ficticios, solo para pruebas |
| `src/data/catalog.ts` | Repositorio de la tienda: lee con caché por etiqueta (`catalog`) que el panel invalida al guardar |
| `src/lib/catalog-store.ts` | Almacén: Neon, memoria (pruebas) o solo lectura (sin base) |
| `src/lib/db.ts` | Esquema y migraciones: se aplican solas en la primera petición |
| `src/lib/inventory.ts` | Disponibilidad calculada desde el stock y promoción aplicada |
| `src/lib/catalog-import.ts` | Importación y exportación CSV, plantilla y WooCommerce |

Reglas de los datos:
- Precio vacío muestra "Precio por confirmar" y no suma al subtotal.
- El precio rebajado propio debe ser menor que el precio; gana sobre la promoción general de `src/config/store.ts`.
- La disponibilidad sale del stock: sin control de inventario → Disponible; 0 → Agotado (o Bajo pedido si se permite); hasta el umbral → Pocas unidades. Los agotados no se pueden añadir al carrito y nadie puede pedir más unidades de las que hay.
- Borrador o archivado despublica el producto. Una categoría o marca oculta oculta también sus productos.

## Arquitectura

```
src/
  app/          Rutas (páginas, metadatos SEO, sitemap, robots)
  components/   Presentación
  config/       Configuración comercial y textos
  data/         Modelo y acceso a datos (repositorio)
  lib/          Lógica de negocio pura: precios, carrito, filtros, WhatsApp
  store/        Estado cliente: carrito persistente y avisos
  styles/       Tokens de diseño
```

- **Carrito:** guarda en `localStorage` solo `{id, qty, seenPrice}`. Precio, promoción y disponibilidad se recalculan siempre contra el catálogo. Se avisan precios cambiados, productos retirados o agotados y cantidades por encima del máximo. Se sincroniza entre pestañas.
- **El precio del navegador no es una fuente confiable.** Si en el futuro se añaden pagos en línea, el servidor debe recalcular el total desde el catálogo antes de cobrar.
- **WhatsApp** (`src/lib/whatsapp.ts`): construye el mensaje y el enlace `https://wa.me/{número}?text={encodeURIComponent(mensaje)}`. El mensaje incluye tienda, ID provisional, productos, referencias, cantidades, precios, subtotal y consulta de envío. No incluye datos personales: la ciudad es opcional y se limpia. Tras abrir WhatsApp la tienda nunca dice "pedido recibido".
- **Filtros** en la URL (`?q=&marca=&disponibilidad=&promo=1&min=&max=&orden=`), renderizados en el servidor; las URL se pueden compartir.

## Pruebas

```bash
npm run typecheck
npm test            # Vitest: lógica y componentes (84 pruebas)
npm run test:e2e    # Playwright: escritorio, tablet, móvil y panel de catálogo (88 pruebas)
```

La primera vez, para las pruebas e2e: `npx playwright install chromium`. Usan el puerto 3217 y un número de WhatsApp ficticio de prueba.

Las e2e cubren:
- el flujo completo categoría → producto → carrito → pedido, con verificación del enlace `wa.me` decodificado;
- búsqueda sin resultados, filtros, ofertas, producto agotado y 404;
- ausencia de scroll horizontal y de errores graves de accesibilidad (axe, WCAG 2 A/AA) en 11 páginas y 3 tamaños.

## Despliegue

Funciona en cualquier hosting compatible con Next.js (p. ej. Vercel) o en un servidor Node:

```bash
npm run build
npm run start   # puerto 3000 por defecto; -p para cambiarlo
```

Antes de publicar:
1. Configura `NEXT_PUBLIC_WHATSAPP_NUMBER` y `NEXT_PUBLIC_SITE_URL` en el hosting.
2. Conecta en Vercel las integraciones **Neon** (catálogo y guías) y **Blob** (fotos del panel), y define `ADMIN_PASSWORD` y `SESSION_SECRET`. Para una tienda nueva que debe arrancar vacía, define también `CATALOG_SEED=none` antes del primer despliegue.
3. Completa `src/config/store.ts`.
3. Reemplaza los textos legales de `/privacidad` y `/terminos` por los aprobados por la tienda.
4. Reemplaza la ilustración del hero por una fotografía autorizada.

No hay credenciales en el repositorio: `.env*` está en `.gitignore`, salvo `.env.example`.

## Documentación de diseño

- `docs/fase-1-diseno.md`: marca, sistema visual, arquitectura de información, flujos, backlog y criterios.
- `design/prototipo-volt-dj.html`: prototipo navegable de la fase 1.
