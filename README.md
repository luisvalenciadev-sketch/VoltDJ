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

Se edita en el panel (`/admin/configuracion`). La variable de entorno es solo el valor inicial, mientras la tienda no guarde otro:

```
NEXT_PUBLIC_WHATSAPP_NUMBER=57XXXXXXXXXX   # solo dígitos, con indicativo de país, sin "+"
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

- Si el número falta o es inválido, la tienda **no inventa uno**: oculta los accesos rápidos a WhatsApp y deshabilita el botón de envío del pedido con un aviso.
- Las variables `NEXT_PUBLIC_*` se incrustan al compilar. **Después de cambiarlas hay que volver a ejecutar `npm run build`.** El número guardado en el panel no necesita recompilar.

### Datos de la tienda

Se editan en el panel, en **Configuración** (`/admin/configuracion`), y se guardan en Neon (tabla `settings`):

- **Tienda:** nombre, eslogan, descripción, WhatsApp de pedidos, teléfono, correo, dirección, horario, razón social, NIT, prefijo de pedidos, cinta superior y redes.
- **Marca:** logo para fondo oscuro y para fondo claro, ícono de la pestaña y color de acento. El color debe tener contraste de 4,5:1 con el fondo; si no lo tiene, el panel sugiere el mismo tono más claro. El texto de los botones (oscuro o blanco) se elige solo.
- **Políticas:** envíos, garantía, cambios, medios de pago y el texto de privacidad y de términos, con vista previa. Formato: `## ` para subtítulos, `- ` para listas, línea en blanco entre párrafos.
- **SEO:** título y descripción para Google e imagen para compartir el enlace.

`src/config/store.ts` guarda solo los valores iniciales (`initialStore`, o `blankStore` con `CATALOG_SEED=none`) y lo que no cambia desde el panel (`SITE`: URL, idioma y moneda). Un valor vacío se muestra como "pendiente".

### Correos al cliente

Configuración → **Notificaciones**. El cliente recibe un correo en cada paso de su pedido (confirmado, enviado, en reparto, entregado, entrega fallida con enlace para reprogramar, reprogramado, cancelado) si la guía tiene su correo; el dueño recibe un aviso cuando un pedido deja un producto en stock bajo o agotado.

- **Proveedores:** Gmail (sin dominio propio, con contraseña de aplicación) o Resend (con dominio verificado). Se eligen con variables de entorno en Vercel; las claves nunca pasan por el panel. Ver `.env.example` y `src/lib/mailer.ts`.
- **Cuándo se envía:** al crear o cambiar la guía, cuando el cliente abre su página de seguimiento y en una revisión diaria (`/api/cron/notificaciones`, firmada con `CRON_SECRET`), para que los pedidos en modo automático también avisen. Si el pedido avanzó varios pasos sin avisar, sale un solo correo, el del paso más reciente (`src/lib/notify-rules.ts`).
- **Nunca bloquea:** si el correo falla, el cambio ya quedó guardado, el error queda en el Historial (filtro Correos) y se reintenta en la siguiente oportunidad. El historial guarda el correo del cliente enmascarado (`l***@gmail.com`).
- **Sin proveedor configurado**, la tienda funciona igual y simplemente no salen correos.

### Usuarios y permisos

Se administran en `/admin/usuarios` (solo el dueño):

- **Dueño:** todo el panel. **Asesor:** pedidos y guías, e inventario (ajustar stock); no abre productos, precios, promociones, configuración, contenido, usuarios ni historial. Las acciones del servidor lo vuelven a verificar, no solo el menú (`src/lib/permissions.ts`).
- **Primer ingreso:** se entra con `ADMIN_PASSWORD` y se crea el usuario del dueño. Desde ese momento la contraseña única deja de funcionar y cada persona entra con su correo.
- **Contraseñas:** scrypt de `node:crypto` (`src/lib/passwords.ts`), mínimo 10 caracteres. Cambiar la contraseña, el rol o desactivar a alguien cierra sus sesiones abiertas.
- **Historial** (`/admin/historial`): quién cambió qué y cuándo (precios, estado, stock, promociones, configuración, contenido, usuarios). Los cambios de precio y de stock se pueden deshacer si nadie los cambió después.
- **Recuperación:** si el único dueño pierde su contraseña, `ADMIN_RECOVERY=1` vuelve a habilitar la contraseña única (ver `.env.example`).

### Contenido del inicio

Se edita en el panel, en **Contenido** (`/admin/contenido`), y se guarda en Neon (fila `content` de `settings`):

- **Inicio:** texto pequeño, párrafo y botón de la portada; orden y encendido de las secciones (banners, categorías, destacados, ofertas, accesorios, videos, reseñas, marcas, cómo compras, preguntas).
- **Banners:** foto con título, subtítulo y botón escritos aparte (nunca dentro de la imagen), con fechas de inicio y fin. Carrusel con deslizamiento nativo, sin avance automático.
- **Videos "Mira cómo suena":** MP4 subido a Blob (hasta 50 MB) o enlace de YouTube. YouTube no se carga hasta que el cliente pulsa play (`youtube-nocookie`).
- **Preguntas frecuentes** y **reseñas** (calificación, número y reseñas destacadas copiadas de Google, con enlace para verificarlas).

`src/config/content.ts` guarda solo los valores iniciales.

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

La tienda elige uno de cinco temas en **Configuración → Diseño**: Escenario (oscuro, el original), Vitrina, Estudio, Bodega y Barrio. Comparten datos, lógica y componentes; cambia la presentación.

- `src/config/themes.ts`: colores, familias, radios y densidad de cada tema. El layout genera con ellos las variables CSS por `[data-theme]`. Las pruebas verifican el contraste de cada tema (`themes.test.ts`).
- `src/styles/themes.css`: lo que cambia de forma (héroe sin 3D, tarjetas en caja, filas densas…).
- `src/styles/tokens.css`: escala tipográfica, espaciado y movimiento compartidos.
- `src/app/fonts.ts`: dos familias por tema. Solo se precargan las de Escenario.
- El color de acento de la tienda se aplica en cualquier tema, aclarado u oscurecido lo justo para leerse sobre su fondo.
- **Vista previa:** `/?tema=vitrina` muestra la tienda con otro tema solo en esa pestaña, también al navegar; `?tema=salir` la quita. El panel siempre usa Escenario.

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
| `src/data/store.ts` / `src/lib/settings-store.ts` | Datos de la tienda: caché con la etiqueta `settings` y almacén (Neon, memoria o solo lectura) |

Reglas de los datos:
- Precio vacío muestra "Precio por confirmar" y no suma al subtotal.
- El precio rebajado propio debe ser menor que el precio. Las promociones (`/admin/promociones`) se aplican por tienda, categoría o producto, con fechas en hora de Colombia; a un producto le toca la mayor vigente, y si además tiene precio rebajado propio la tienda muestra el más bajo (`src/lib/promotions.ts`).
- Medios de pago y cuotas (`Configuración → Pagos`): la ficha muestra "Desde $X al mes" con la cuota más baja de los medios a cuotas activos, redondeada al millar hacia arriba y sin intereses (referencia sujeta a aprobación).
- Envíos (`Configuración → Envíos`): zonas con tiempo y costo (vacío = se cotiza, 0 = gratis) y despacho el mismo día con hora de corte. El cliente elige su zona al enviar el pedido y llega en el mensaje.
- Una guía con productos del catálogo aparta sus unidades del inventario al crearla o editarla y las devuelve al cancelarla o eliminarla (`src/lib/order-stock.ts`, `src/lib/guide-stock.ts`). Nunca bloquea: si no alcanza, aparta lo que hay y avisa. Las guías creadas antes de esto no tocan el inventario.
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
- **Pedido** (`/carrito`): carrito, datos de envío (nombre, celular y ciudad obligatorios; zona, dirección y correo opcionales) y envío en una sola página. Al enviar, `src/app/carrito/actions.ts` recalcula productos y precios con el catálogo y guarda un **pedido de la web** (`src/lib/drafts-store.ts`, tabla `order_drafts`) con un código `VD-XXXX-XXXX`. En el panel aparece en la lista de guías como **Borrador** (pestaña "Borradores"); al abrirlo se llena el formulario de la guía y la guía conserva ese mismo código, que el cliente ya puede consultar en `/seguimiento`. Sin base de datos, el pedido sale igual por WhatsApp con un ID provisional (prefijo de la configuración). `/pedido` redirige al carrito.
- **WhatsApp** (`src/lib/whatsapp.ts`): construye el mensaje y el enlace `https://wa.me/{número}?text={encodeURIComponent(mensaje)}`. El mensaje incluye tienda, código del pedido, nombre, productos, referencias, cantidades, precios, subtotal, zona, ciudad y dirección. El celular y el correo no viajan en el mensaje: quedan en el pedido guardado. Tras abrir WhatsApp la tienda nunca dice "pedido recibido".
- **Filtros** en la URL (`?q=&marca=&disponibilidad=&promo=1&min=&max=&orden=`), renderizados en el servidor; las URL se pueden compartir.

## Pruebas

```bash
npm run typecheck
npm test            # Vitest: lógica, componentes y contraste de los temas (230 pruebas)
npm run test:e2e    # Playwright: escritorio, tablet, móvil, los cinco temas, panel de catálogo, configuración, ventas, contenido, correos y usuarios (136 pruebas)
```

La primera vez, para las pruebas e2e: `npx playwright install chromium`. Usan el puerto 3217 y un número de WhatsApp ficticio de prueba.

Las e2e cubren:
- los cuatro temas nuevos sin scroll horizontal ni errores graves de accesibilidad en inicio, catálogo, ficha y carrito, en escritorio y celular;
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
2. Conecta en Vercel las integraciones **Neon** (catálogo y guías) y **Blob** (fotos del panel), y define `ADMIN_PASSWORD` y `SESSION_SECRET`. Al primer ingreso, crea el usuario del dueño en `/admin/usuarios`. Para una tienda nueva que debe arrancar vacía, define también `CATALOG_SEED=none` antes del primer despliegue.
3. Completa los datos en `/admin/configuracion`, incluidos los textos legales de privacidad y términos aprobados por la tienda.
4. Reemplaza la ilustración del hero por una fotografía autorizada.

No hay credenciales en el repositorio: `.env*` está en `.gitignore`, salvo `.env.example`.

## Documentación de diseño

- `docs/fase-1-diseno.md`: marca, sistema visual, arquitectura de información, flujos, backlog y criterios.
- `design/prototipo-volt-dj.html`: prototipo navegable de la fase 1.
