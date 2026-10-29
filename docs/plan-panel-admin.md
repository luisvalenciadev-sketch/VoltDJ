# Plan técnico — Panel de administración completo

Estado: **fase 1** construida en `feat/panel-fase-1` · **fase 2** en `feat/panel-fase-2` · **fase 2b** en `feat/panel-fase-2b` · 2026-10-29

### Cambios respecto al plan en la fase 2b

- **Variantes por CSS, no componentes por tema:** héroe, tarjeta, categorías y cabecera cambian con reglas `[data-theme=…]` en `src/styles/themes.css`. El marcado es el mismo en los cinco temas, así que la vista previa puede cambiar de tema en el navegador sin pedir otra página.
- **Valores de los temas en TypeScript** (`src/config/themes.ts`), con pruebas de contraste para cada par de texto y fondo.
- **Vista previa con `?tema=`**, guardada en `sessionStorage` de esa pestaña: no pasa por el servidor ni la ven otros visitantes.
- **El panel siempre en Escenario** (`.admin-root` redefine el tema), elija la tienda el que elija.
- **Pendiente:** las variantes de Barrio que dependen de contenido (fotos del local, reseñas y videos arriba) esperan la fase 4. El logo para fondo claro se muestra solo en los temas claros.

### Cambios respecto al plan en la fase 2

- **Una sola fila `store` en `settings`**, no una por bloque: tienda, marca, políticas y SEO se guardan juntos y se combinan campo por campo con los valores iniciales (`mergeStore`). Un campo nuevo del código aparece solo en las tiendas que ya guardaron.
- **Componentes de cliente por contexto, no por props:** el layout pasa nombre, WhatsApp y prefijo de pedidos a `StoreInfoProvider`; el carrito, el pedido y el botón de WhatsApp de las tarjetas lo leen de ahí.
- **Contraste exigido, no solo avisado:** el acento debe dar 4,5:1 con el fondo, porque se usa como texto (precios rebajados, pasos activos). Si no llega, el panel ofrece el mismo tono aclarado lo justo.
- **Textos legales:** formato mínimo (`## `, `- `, párrafos) en lugar de un editor enriquecido. No admite HTML.
- **Pendiente para fases siguientes:** el texto del héroe y las preguntas frecuentes siguen en el código (fase 4); `PROMO` y los medios de pago con cuotas, en la fase 3. El prefijo de las guías de seguimiento sigue fijo.

### Cambios respecto al plan en la fase 1

- **Migraciones al arrancar, no en el build.** El esquema y la carga inicial se aplican en la primera petición (`src/lib/db.ts`, tabla `schema_migrations`), igual que ya hacían las guías. Así, las vistas previas de Vercel y una tienda nueva no dependen de que la base esté disponible al compilar. No hay `npm run db:migrate` ni `db:seed`: la carga inicial copia el catálogo de `src/data/products.ts` una sola vez, salvo con `CATALOG_SEED=none`.
- **Stock vacío = "Disponible".** Un producto sin control de inventario se muestra disponible, no "Consultar": es lo que esperan las tiendas que no llevan stock en el sistema.
- **Caché:** `unstable_cache` con la etiqueta `catalog` y `revalidateTag(…, { expire: 0 })` al guardar. Next 16 recomienda migrar a Cache Components (`use cache`); queda para cuando se migre todo el proyecto.
Objetivo: que cada tienda controle toda su página desde `/admin` (catálogo, inventario, marca, ventas, contenido) sin pasar por nosotros, y que el mismo código sirva para vender la plataforma a otras tiendas de sonido.

## Decisiones tomadas

| Tema | Decisión |
| --- | --- |
| Fotos | Vercel Blob: subida directa desde el navegador, servida por CDN |
| Varias tiendas | Un despliegue por tienda: mismo repositorio, un proyecto de Vercel, una base Neon y un Blob por cliente |
| Acceso | Contraseña única (la actual) en las fases 1 a 4; usuarios y roles en la fase 5 |
| Entrega | Por fases, cada una en su rama con despliegue de vista previa; nada llega a `main` (producción) sin revisión |
| Importación | Plantilla CSV propia **y** el CSV de exportación de WooCommerce, con fotos |
| Diseño | **5 temas** a elegir en el panel, cada uno con logo, colores, banners y orden de secciones propios |

## Cómo está hoy

- El catálogo vive en el código: `src/data/products.ts`, `brands.ts`, `categories.ts`. Pero ya existe un único punto de entrada, `src/data/catalog.ts` (`getProducts`, `getProductBySlug`, `getCategories`, `getBrands`, `getCartCatalog`). Es lo que se cambia; las páginas casi no se tocan.
- Los datos de la tienda (`STORE`), la promoción (`PROMO`) y las preguntas frecuentes (`FAQ`) son constantes que se leen directamente en unos 19 archivos: `layout`, `Header`, `Footer`, `page`, `producto`, `contacto`, `envios-y-garantias`, `preguntas-frecuentes`, `privacidad`, `terminos`, `seguimiento`, `robots`, `sitemap`, `pricing`, `whatsapp`, entre otros.
- Las guías ya usan Neon con `create table if not exists` en el propio código (`src/lib/guides-store.ts`), con un almacén en memoria para las pruebas.
- El panel tiene contraseña única, sesión JWT y un proxy que filtra `/admin`.
- `src/app/layout.tsx` revalida cada 3 600 s. El proyecto **no** usa Cache Components; se sigue el modelo de caché anterior: `unstable_cache` + `revalidateTag`.

## Arquitectura

```
Navegador ──► páginas de la tienda (Server Components)
                 │  lee con caché por etiquetas: "catalog", "settings", "content"
                 ▼
           src/data/*.ts  (repositorios: única puerta a los datos)
                 │
       ┌─────────┴──────────┐
     Neon Postgres       Vercel Blob (fotos)
       ▲                     ▲
       │ Server Actions      │ subida directa con token
     /admin  ─────────────────┘   (ruta /api/admin/upload valida la sesión)
       │
       └─ tras guardar: revalidateTag(etiqueta, { expire: 0 }) → la tienda muestra el cambio en la siguiente visita
```

- **Lectura:** cada repositorio envuelve su consulta en `unstable_cache` con su etiqueta. La tienda sigue siendo rápida y no consulta la base en cada visita.
- **Escritura:** solo con Server Actions del panel, que llaman `requireAdmin()` primero, validan en el servidor e invalidan la etiqueta con `{ expire: 0 }`, para que el dueño vea su cambio al recargar.
- **Pruebas sin base:** cada repositorio tiene una versión en memoria, como hoy las guías, para que las pruebas unitarias y e2e no dependan de Neon.

### Migraciones

Hoy el esquema se crea "al vuelo" en cada almacén. Con diez tablas eso se vuelve frágil. Propuesta:

- Carpeta `db/migrations/` con archivos SQL numerados (`001_catalogo.sql`, `002_tienda.sql`…) y una tabla `schema_migrations`.
- Script `npm run db:migrate`, que corre antes de `next build` cuando existe `DATABASE_URL`. Así, cada tienda nueva queda con su esquema al primer despliegue.
- Script `npm run db:seed`: para VOLT DJ / CD-R, carga los 28 productos, marcas, categorías, `STORE`, `PROMO` y `FAQ` actuales desde el código; para una tienda nueva, deja la tienda vacía con textos de ejemplo.

## Modelo de datos

| Tabla | Campos principales | Notas |
| --- | --- | --- |
| `settings` | `key` (pk), `value jsonb`, `updated_at` | Una fila por bloque: `store` (nombre, contacto, NIT, horario, redes, legales), `brand` (logo, colores), `payments`, `shipping`, `home`, `seo` |
| `categories` | `id`, `slug` (único), `name`, `description`, `image jsonb`, `sort`, `visible` | |
| `brands` | `id`, `name`, `logo jsonb`, `authorized`, `sort`, `visible` | |
| `products` | `id`, `slug` (único), `sku`, `name`, `brand_id`, `category_id`, `description`, `price`, `compare_at_price`, `key_figure` ("18\"", "1000W"), `specs jsonb`, `images jsonb` (ordenadas), `art`, `stock int null`, `low_stock_at int`, `allow_backorder bool`, `max_per_order`, `featured`, `status` (draft · published · archived), `created_at`, `updated_at` | `stock = null` significa "no controlo inventario" y muestra "Consultar" |
| `stock_movements` | `id`, `product_id`, `delta`, `reason` (ajuste · pedido · cancelación · importación), `ref` (código de guía), `note`, `created_at` | Historial de cada cambio de stock |
| `promotions` | `id`, `name`, `scope` (tienda · categoría · producto), `scope_id`, `percent`, `starts_at`, `ends_at`, `active` | Reemplaza `PROMO`; se aplica la mejor promoción vigente |
| `faqs` | `id`, `question`, `answer`, `sort`, `visible` | Reemplaza `FAQ` |
| `banners` | `id`, `title`, `subtitle`, `cta_label`, `cta_href`, `image jsonb`, `starts_at`, `ends_at`, `sort`, `visible` | Texto editable, nunca dentro de la imagen (fase 4) |
| `videos` | `id`, `title`, `blob_url`, `poster jsonb`, `product_id null`, `sort`, `visible` | "Mira cómo suena" (fase 4) |
| `guides` | (ya existe) | Se le agrega el descuento de stock al confirmar (fase 3) |
| `users`, `audit_log` | (fase 5) | Dueño y asesor; quién cambió qué |

**Disponibilidad calculada**, no escrita a mano:
`stock null` → Consultar · `stock 0` y sin pedido bajo encargo → Agotado · `stock 0` con pedido bajo encargo → Bajo pedido · `stock ≤ low_stock_at` → Pocas unidades · en otro caso → Disponible.
Va como función pura en `src/lib/inventory.ts`, con pruebas.

## Fases

Tamaño relativo: S pequeño · M mediano · L grande.

### Fase 1 — Catálogo e inventario (L)

Pantallas en `/admin`:

- **Productos:** lista con búsqueda, filtros por categoría, marca, estado y stock, y edición rápida de precio y stock en la misma fila. Formulario completo con nombre, slug automático, SKU, marca, categoría, precio, precio antes, cifra clave, descripción, especificaciones (filas etiqueta/valor), fotos (subir, ordenar arrastrando, texto alternativo, eliminar), stock, alerta de stock bajo, pedido bajo encargo, máximo por pedido, destacado y estado. Botones para duplicar, archivar y ver en la tienda.
- **Categorías y marcas:** crear, editar, ordenar, ocultar y subir imagen o logo. Una categoría con productos no se puede borrar: se oculta.
- **Inventario:** vista de stock con ajuste rápido (+/−, motivo) e historial por producto. Lista de productos agotados y con stock bajo.
- **Importar y exportar:** plantilla CSV que Excel abre y guarda. Al importar se muestra una vista previa con errores por fila antes de aplicar. Crea productos nuevos o actualiza por SKU (precio, stock, estado).
- **Importar desde WooCommerce:** el panel reconoce el CSV de exportación de productos de WooCommerce y asigna sus columnas:

  | WooCommerce | Campo nuestro |
  | --- | --- |
  | `SKU` | `sku` |
  | `Name` | `name` |
  | `Regular price` | `price` |
  | `Sale price` | precio con descuento |
  | `Stock` | `stock` |
  | `In stock?` | `stock` |
  | `Categories` | categoría, creada si no existe |
  | `Brands` o atributo de marca | marca |
  | `Description` y `Short description` | descripción, con el HTML limpiado |
  | `Images` | fotos |
  | `Published` | `status` |

  Las fotos llegan como URL de la tienda vieja: se descargan en segundo plano y se suben a Blob, con un indicador de progreso y reintento por foto. Los productos variables (con variaciones) se importan como productos separados, avisando en la vista previa.
  Tamaño: suma M a la fase 1. Se prueba con un archivo de muestra real de WooCommerce antes de darlo por terminado.

Cambios en la tienda:

- `src/data/catalog.ts` lee de Neon con caché por etiquetas.
- `availability` pasa a calcularse desde el stock.
- `next.config.ts` agrega `images.remotePatterns` para el dominio de Vercel Blob.
- La ficha del producto usa la cifra clave en la vitrina del inicio.

Subida de fotos:

- `@vercel/blob/client` `upload()` desde el navegador.
- La ruta `POST /api/admin/upload` verifica la sesión, limita a jpg, png y webp de hasta 8 MB y entrega el token. Así se evita el límite de 1 MB de las Server Actions.
- Se guardan URL, ancho, alto y texto alternativo. `next/image` optimiza al servir.
- Al borrar una foto del producto se borra también del Blob.

### Fase 2 — Tienda y marca (M)

- **Datos de la tienda:** nombre, eslogan, descripción, WhatsApp de pedidos, teléfono, correo, dirección, ciudad, horario, razón social, NIT, redes y cinta superior.
- **Marca:** logo claro y oscuro, favicon y color de acento con vista previa y control de contraste. Los colores se aplican como variables CSS sobre `src/styles/tokens.css`.
- **Políticas:** envíos, garantía, cambios y devoluciones, términos y privacidad, con editor de texto simple y vista previa.
- **SEO:** título, descripción e imagen para compartir.
- Refactor: `STORE` deja de ser constante. `getStore()` (con etiqueta `settings`) se usa en Server Components, y los componentes de cliente lo reciben por props. El número de WhatsApp sale de `settings`; la variable `NEXT_PUBLIC_WHATSAPP_NUMBER` queda solo como valor inicial.

### Fase 2b — Cinco temas (L)

La tienda elige su tema en **Configuración → Diseño**, con vista previa antes de aplicar. Todos los temas comparten los mismos datos y la misma lógica (carrito, WhatsApp, seguimiento, cuotas); solo cambia la presentación.

| Tema | Idea | Para quién |
| --- | --- | --- |
| **Escenario** | Oscuro, acento brillante, visor 3D protagonista (el actual de VOLT DJ) | Tiendas DJ y de iluminación |
| **Vitrina** | Claro, cifras técnicas y precios grandes en rojo, mosaico de vitrina (tomado de los principios de CCM) | Tiendas de parlantes y car audio con mucho catálogo y ofertas |
| **Estudio** | Claro y sobrio, fichas técnicas amplias, tipografía de lectura | Audio profesional, estudios, instalaciones |
| **Bodega** | Denso, listas con filtros siempre visibles, precio y stock al frente | Mayoristas y tiendas con cientos de referencias |
| **Barrio** | Cálido, fotos del local y del equipo, videos y reseñas arriba | Tiendas pequeñas que venden por confianza |

Cómo se construye:

- **Capa de tokens:** cada tema es un archivo de variables (colores, tipografías, radios, sombras, densidad) sobre `src/styles/tokens.css`. El acento y el logo que elige la tienda se aplican encima del tema.
- **Componentes con variantes:** las piezas que cambian de forma entre temas (héroe, tarjeta de producto, vitrina, cabecera, pie) tienen una variante por tema. El resto (carrito, ficha, seguimiento, legales) cambia solo por tokens. Así se mantienen 5 temas sin duplicar 5 tiendas.
- **Fuentes:** cada tema carga solo sus 2 familias con `next/font`.
- **Calidad:** cada tema pasa las mismas pruebas e2e y de accesibilidad (axe) que hoy pasa VOLT DJ, en celular y computador, y con contraste mínimo verificado al cambiar el acento.
- **Orden de construcción:** primero la capa de tokens con el tema actual (Escenario) y Vitrina; luego Estudio, Bodega y Barrio, uno por uno.

Es la fase más costosa de mantener: cada componente nuevo de la tienda debe verse bien en los 5 temas.

- **Promociones:** varias a la vez, por tienda, categoría o producto, con inicio y fin en hora de Colombia. Reemplaza `PROMO` y conserva el apagado automático actual (`promoIsActive`).
- **Medios de pago:** lista activable (transferencia con datos de cuenta, Nequi, Bancolombia, PSE/Wompi, Mercado Pago, Addi, Sistecrédito), con texto de instrucciones y número de cuotas. La tarjeta y la ficha muestran "Desde $X al mes" y los logos **solo** para los medios activos. El mensaje de WhatsApp incluye los medios disponibles.
- **Envíos:** ciudades o zonas con tiempo de entrega y costo opcional, y "despachamos el mismo día" con hora de corte.
- **Inventario conectado a pedidos:** al crear una guía con productos y marcarla como confirmada, se descuenta el stock (movimiento `pedido`); al cancelarla, se devuelve. Si un producto no alcanza, se avisa sin bloquear.

### Fase 4 — Contenido del inicio (M)

- **Banners del carrusel:** imagen con título, subtítulo y botón escritos en el panel, y fechas de inicio y fin.
- **Inicio:** activar, desactivar y ordenar secciones (vitrina, ofertas, categorías, marcas, videos, reseñas, preguntas frecuentes), y elegir los productos de la vitrina.
- **Videos "Mira cómo suena":** subida a Blob de videos verticales cortos (MP4 de hasta 50 MB) con portada, enlazables a un producto.
- **Preguntas frecuentes:** crear, editar y ordenar.
- **Reseñas de Google:** ingresar calificación, número de reseñas y reseñas destacadas a mano. La conexión automática con Google Places queda como opcional, porque requiere clave de API y tiene costo.

### Fase 5 — Usuarios e historial (M)

- Tabla `users` con correo y contraseña cifrada (scrypt de `node:crypto`, sin dependencias nuevas). Roles: **dueño** (todo) y **asesor** (pedidos, guías y stock; sin precios, marca ni usuarios).
- La contraseña única actual sigue funcionando para crear el primer dueño y luego se desactiva.
- `audit_log`: quién cambió qué y cuándo, con valor anterior y nuevo, para precios, stock y publicación. Opción de deshacer en precios y stock.

## Navegación del panel

```
Panel
├─ Inicio          resumen: pedidos en curso, por cobrar, agotados, stock bajo
├─ Pedidos y guías (ya existe)
├─ Productos       lista · nuevo · editar · importar/exportar
├─ Inventario      stock · movimientos · alertas
├─ Categorías
├─ Marcas
├─ Promociones                (fase 3)
├─ Contenido       inicio · banners · videos · preguntas frecuentes   (fase 4)
├─ Configuración   tienda · marca · diseño (5 temas) · pagos · envíos · políticas · SEO  (fases 2–3)
└─ Usuarios                   (fase 5)
```

Pensado primero para celular: el dueño edita precios y stock desde el teléfono en la tienda. Lista con edición en la fila y formularios de una columna. Reutiliza los estilos actuales del panel (`admin-bar`, `admin-head`, `alert`) y `src/components/admin/AdminForms.tsx`.

## Pruebas

- **Unitarias (Vitest):** disponibilidad calculada desde stock, mejor promoción vigente, cálculo de cuotas, validación e importación de CSV, `slug` único y movimientos de stock.
- **E2E (Playwright):** con almacenes en memoria, crear producto con foto (Blob simulado), editar precio y verlo en la tienda, agotar stock y ver "Agotado", importar CSV con un error y corregirlo, y que las rutas `/admin/*` sin sesión redirijan.
- Las pruebas actuales (`cart`, `tracking`, `whatsapp`, `catalog-filter`, e2e de guías) deben seguir pasando en cada fase.

## Nueva tienda (despliegue por cliente)

1. Crear un proyecto en Vercel desde el repositorio (rama `main`).
2. Agregar las integraciones Neon y Blob, que crean `DATABASE_URL` y `BLOB_READ_WRITE_TOKEN`.
3. Definir `ADMIN_PASSWORD`, `SESSION_SECRET` y `NEXT_PUBLIC_SITE_URL`.
4. Desplegar: `db:migrate` crea el esquema y la tienda arranca vacía.
5. La tienda entra a `/admin`, configura sus datos y marca, e importa su catálogo desde CSV.
6. Conectar el dominio.

Una mejora en `main` se despliega a todas las tiendas. Para ensayar con un cliente antes que con el resto, se usa una rama de "canal estable" (opcional, más adelante).

## Riesgos y preguntas abiertas

- **Costos por tienda:** Vercel en plan Hobby no admite uso comercial, así que cada tienda necesita un proyecto en plan Pro o hay que agruparlas en un equipo Pro. Neon y Blob tienen cupos gratis que alcanzan para una tienda pequeña; hay que confirmarlo con el catálogo real de cada cliente. Este costo sale de los $220.000 de la mensualidad.
- **Videos en Blob:** consumen transferencia. Hay que limitar el tamaño y la cantidad por tienda, o enlazar a Instagram o TikTok en lugar de alojarlos.
- **Contraseña única hasta la fase 5:** todos los que la conocen tienen acceso total. Es aceptable para tiendas de una o dos personas.
- **Fotos de WooCommerce:** si la tienda vieja ya no está en línea o bloquea descargas, las fotos no se pueden traer. La vista previa lo detecta y la tienda las sube a mano.
- **Cinco temas:** multiplican por cinco la revisión visual de cada cambio. Las pruebas e2e y de accesibilidad corren en los 5 temas para que esto no dependa de revisar a ojo.
