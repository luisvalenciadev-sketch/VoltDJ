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

### Identidad visual

Los colores, la tipografía, el espaciado y los radios están en `src/styles/tokens.css`. Las fuentes se cargan en `src/app/fonts.ts`.

### Catálogo

| Archivo | Contenido |
|---|---|
| `src/data/types.ts` | Modelo de producto, categoría y marca |
| `src/data/products.demo.ts` | Productos de **demostración** |
| `src/data/categories.ts` / `brands.ts` | Categorías y marcas |
| `src/data/catalog.ts` | Repositorio: única puerta de acceso a los datos |

Para cargar el catálogo real:
1. Crea `src/data/products.ts` con el mismo tipo `Product[]`, con `isDemo: false` y `status: "published"`.
2. En `src/data/catalog.ts`, cambia `SOURCE` a ese arreglo.
3. Pon las fotos en `public/productos/…` y añádelas a `images` con `src`, `alt`, `width` y `height`. Sin fotos se muestra una ilustración provisional.
4. En las marcas con autorización, marca `authorized: true` para que aparezcan en la sección de marcas del inicio.

Reglas de los datos:
- `price: null` muestra "Precio por confirmar" y no suma al subtotal.
- `promoPrice` debe ser menor que `price`; solo entonces se muestran el precio anterior y el porcentaje calculado.
- `availability` acepta `disponible`, `pocas`, `bajo_pedido`, `agotado` o `consultar`. Los productos `agotado` no se pueden añadir al carrito.
- `status: "draft"` o `"archived"` despublica el producto.
- Los productos con `isDemo: true` llevan `noindex` y no entran en el sitemap.

Si el catálogo lo va a editar personal no técnico, la recomendación es conectar un CMS headless reimplementando las funciones de `src/data/catalog.ts`. Páginas y componentes no cambian.

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
npm test            # Vitest: lógica y componentes (39 pruebas)
npm run test:e2e    # Playwright: escritorio, tablet y móvil (51 pruebas)
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
2. Reemplaza el catálogo demo y completa `src/config/store.ts`.
3. Reemplaza los textos legales de `/privacidad` y `/terminos` por los aprobados por la tienda.
4. Reemplaza la ilustración del hero por una fotografía autorizada.

No hay credenciales en el repositorio: `.env*` está en `.gitignore`, salvo `.env.example`.

## Documentación de diseño

- `docs/fase-1-diseno.md`: marca, sistema visual, arquitectura de información, flujos, backlog y criterios.
- `design/prototipo-volt-dj.html`: prototipo navegable de la fase 1.
