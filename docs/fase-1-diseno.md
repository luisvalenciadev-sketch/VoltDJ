# VOLT DJ — Fase 1: Diseño UX/UI

Estado: **pendiente de aprobación**. No se ha iniciado la implementación funcional.

- Prototipo navegable: `design/prototipo-volt-dj.html` (publicado como artifact privado).
- Todos los productos, marcas y precios del prototipo son **de demostración** (`DEMO-*`, "Marca A…F").
- Los textos entre `⟨ ⟩` son **datos comerciales pendientes** que debe aportar la tienda.

---

## 0. Contexto analizado

- El directorio del proyecto estaba vacío: no hay código, estilos ni convenciones previas que conservar.
- **No se recibió la imagen de referencia de CD-R SDJ Colombia.** El análisis del tipo de negocio parte del brief: tienda especializada en equipo DJ, catálogo amplio por categorías, peso fuerte de ofertas, envíos nacionales y confianza comercial como factor de cierre. Cuando llegue la imagen, se revisan categorías y jerarquía contra ella. No se copia su marca, textos ni fotos.

## 1. Concepto de marca

| | |
|---|---|
| Nombre | VOLT DJ (provisional, configurable en `STORE.name`) |
| Posicionamiento | Tienda moderna y especializada en tecnología DJ y audio profesional en Colombia |
| Promesa | "Tu sonido. Tu energía. Tu escenario." |
| Personalidad | Técnica y confiable primero; enérgica en los detalles |
| Tono de voz | Tú, directo, de colega que sabe de equipo. Sin superlativos vacíos ni urgencia falsa |

**Símbolo:** un *fader* de mezclador visto desde arriba (canal vertical + tapa en verde eléctrico). Es reconocible para la comunidad DJ, funciona a 16 px y no depende de un rayo, que es el recurso obvio para "volt".

**Motivo gráfico:** el medidor de nivel por segmentos (VU) aparece en pequeño junto al eyebrow del hero. Se usa con moderación; no es decoración de fondo.

**Escalabilidad:** el nombre de la tienda, la promesa, los colores y la tipografía viven en configuración y tokens. La marca no se ata a una sola categoría y puede crecer hacia estudio, iluminación, alquiler o clases.

## 2. Sistema visual

### Color (tokens únicos, `src/styles/tokens.css` en fase 2)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#101114` | Fondo |
| `--surface` | `#191B20` | Tarjetas, paneles, barra superior |
| `--surface-2` | `#22252B` | Botón secundario, estados hover |
| `--fg` | `#F5F5F5` | Texto principal |
| `--fg-2` | `#A7A9B0` | Texto secundario |
| `--accent` | `#B8FF32` | **Solo** CTA primario, badge del carrito, % de descuento, foco, paso activo |
| `--border` | `#30323A` | Bordes y divisores |
| `--photo` | `#E7E8EB` | Pozo fotográfico de producto |
| `--ok / --warn / --info / --off / --danger` | `#5BD28A / #F2B544 / #7DB4FF / #6B6E77 / #FF6B5E` | Disponibilidad y alertas |

Decisiones:
- **Pozo fotográfico claro.** Casi todas las fotos de fabricante vienen sobre fondo blanco. En lugar de recortarlas o ponerlas sobre negro, se presentan en un pozo gris claro uniforme. Así todas las tarjetas se ven iguales con fotos de distintos proveedores.
- **Disponibilidad con color semántico propio** para no competir con el verde de acción.
- Sin degradados ni glow neón. El único degradado es el fondo del hero, que se va cuando llegue la foto.

### Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Display | Archivo, ancho expandido 115–125 %, 800–900, mayúsculas | Titulares, logotipo, precio grande del detalle |
| Texto e interfaz | Hanken Grotesk 400–700 | Lectura, botones, formularios |
| Técnica | JetBrains Mono | SKU, referencias y valores de especificaciones (Hz, dB, W RMS) |

Escala: 12 · 14 · 16 · 20 · 28 · 40 · 56 px. Precios con cifras tabulares. Mínimo 14 px en interfaz y 16 px en lectura.

### Forma y espaciado
- Radio 4 px (tarjetas, botones, inputs) y 6 px (marcos grandes). Nada de tarjetas muy redondeadas.
- Espaciado en base 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72.
- Objetivo táctil: 48 px para botones primarios y 40 px para compactos; 44 px en iconos del header.

### Iconografía
Trazo de 1,6–1,8 px, línea y esquinas redondeadas, 20–24 px. En la fase 2 usar una sola librería (recomendado: Lucide), más un ícono de WhatsApp propio.

## 3. Arquitectura de información y mapa de navegación

```
/                         Inicio
/catalogo                 Catálogo general (filtros + orden)
/catalogo/[categoria]     Categoría
/buscar?q=                Resultados de búsqueda
/ofertas                  Productos con promoPrice vigente
/marcas/[marca]           Marca (solo si hay autorización de marca)
/producto/[slug]          Detalle de producto
/carrito                  Carrito
/pedido                   Resumen y envío por WhatsApp
/contacto                 Contacto y WhatsApp
/envios-y-garantias       Envíos y garantías
/preguntas-frecuentes     FAQ
/privacidad  /terminos    Legal
/admin                    CMS autenticado (fase 2)
```

Categorías iniciales: Controladores · Mezcladores · Reproductores y tornamesas · Parlantes y monitores · Audífonos · Micrófonos · Iluminación · Accesorios. Se configuran como datos, no en el código.

Navegación: header fijo con logotipo, buscador (en una segunda fila en móvil), WhatsApp y carrito con contador. Debajo va una barra de categorías con scroll horizontal y "Ofertas" como primer ítem.

## 4. Flujo de compra por WhatsApp

1. El usuario elige un producto desde una tarjeta, categoría o búsqueda.
2. **Añadir al carrito** valida la disponibilidad (`agotado` no se puede añadir) y el tope `maxQty`. Un toast con "Ver carrito" confirma sin sacarlo de la página.
3. En el **carrito** puede cambiar cantidades (stepper con límites), eliminar (con deshacer) y vaciar (con deshacer).
4. **Recálculo contra el catálogo:** el navegador guarda solo `{id, qty}`. El precio, la promoción y la disponibilidad se toman siempre del catálogo vigente. Los productos retirados o agotados se marcan y quedan fuera del mensaje. Un precio nulo se muestra como "Precio por confirmar" y no suma.
5. **Resumen:** líneas en solo lectura, ciudad opcional para cotizar el envío, vista previa exacta del mensaje e ID provisional `VD-AAMMDD-XXXX`.
6. **Enviar por WhatsApp** abre `https://wa.me/{numero}?text={encodeURIComponent(mensaje)}`. Este formato funciona en móvil y en escritorio.
7. El cliente envía el mensaje y el asesor confirma disponibilidad, envío y pago. Después del clic la web dice "Abrimos WhatsApp con tu pedido…", **nunca** "pedido recibido".

Además, hay una acción rápida "Consultar por WhatsApp" para un solo producto, en la tarjeta y en el detalle.

**Plantilla del mensaje** (configurable):

```
Hola VOLT DJ, quiero consultar este pedido.
Pedido provisional: VD-261028-4F7K

1. Controlador DJ 2 canales con pads de rendimiento
   Ref.: DEMO-CTR-002
   Cantidad: 1
   Precio unitario: $ 1.690.000 · Total: $ 1.690.000

Subtotal estimado: $ 2.960.000
No incluye envío.
Ciudad de envío: Medellín

¿Me confirman disponibilidad, costo de envío y tiempo de entrega?
```

Datos personales: no se piden. La ciudad es opcional y se limita a 60 caracteres. No se añade nada sensible al enlace.

Si el número no está configurado, el botón se deshabilita y aparece un aviso que lo indica. En el prototipo ocurre así a propósito, porque no se ha inventado ningún número.

## 5. Pantallas

### Prioridad de la primera revisión (diseñadas en el prototipo)
1. **Inicio:** barra de información, header, hero, categorías, destacados, ofertas, marcas, accesorios, beneficios, envíos y garantías, FAQ y footer.
2. **Catálogo, categoría y búsqueda:** ruta de navegación, título con conteo, filtros (categoría, marca, rango de precio, disponibilidad, solo promoción), chips de filtros activos, orden y estado vacío con salida a WhatsApp. En móvil los filtros se pliegan detrás de un botón.
3. **Detalle de producto:** galería 1:1 con miniaturas, marca, nombre, referencia, disponibilidad, precio con ahorro calculado, cantidad, añadir al carrito, consulta por WhatsApp, bloque de envío, garantía y confirmación, descripción, tabla de especificaciones, relacionados y barra fija de compra en móvil.
4. **Carrito:** pasos 1-2-3, líneas editables, alertas por cambios, resumen con subtotal estimado y nota de envío.
5. **Pedido por WhatsApp:** vista previa del mensaje, ID provisional, ciudad opcional, enviar, copiar mensaje y ver enlace generado.

### Siguientes (plantilla definida, contenido pendiente)
Ofertas (catálogo filtrado), Contacto, Envíos y garantías, FAQ, Privacidad y términos (Ley 1581 de 2012 de protección de datos y Estatuto del Consumidor, con texto legal aportado por la tienda) y Panel administrativo (ver §8).

### Responsive
Mobile-first, con cortes por *container query* a 720 y 900/1080 px:
- Móvil: 2 columnas de producto, búsqueda en segunda fila, filtros plegables y barra de compra fija.
- Tablet: 3 columnas y categorías en 4 columnas.
- Escritorio: 4 columnas, filtros laterales fijos y resumen del carrito fijo.

El prototipo trae un selector de ancho (Escritorio / Tablet / Móvil 390).

### Estados
Se ven en la pestaña "Sistema de diseño" del prototipo:
- **Carga:** esqueletos de tarjeta.
- **Vacío:** carrito sin productos y búsqueda sin resultados.
- **Error:** fallo al cargar el catálogo y precio cambiado.
- **Éxito:** WhatsApp abierto, con texto honesto.
- **Disponibilidad:** 5 estados.
- **Precio:** normal, promoción y por confirmar.

## 6. Modelo de producto (borrador para la fase 2)

```ts
type Availability = "disponible" | "pocas" | "bajo_pedido" | "agotado" | "consultar";
interface Product {
  id: string; slug: string; name: string;
  brandId: string; categoryId: string;
  description: string;
  images: { src: string; alt: string; width: number; height: number }[];
  price: number | null;          // COP enteros; null = por confirmar
  promoPrice?: number | null;    // solo si hay promoción real
  promoEndsAt?: string | null;
  sku: string;
  availability: Availability;
  maxQtyPerOrder: number;
  specs: { label: string; value: string }[];
  status: "draft" | "published" | "archived";
  isDemo: boolean;               // separa demo del catálogo definitivo
  featured?: boolean;
  updatedAt: string;
}
```

## 7. Arquitectura propuesta (para validar antes de la fase 2)

- **Next.js (App Router) + TypeScript**: páginas estáticas e ISR para SEO, rutas por slug y metadatos.
- **CSS con tokens** (CSS Modules o Tailwind leyendo los tokens). Se elige uno solo.
- Capas: `config/` (tienda, WhatsApp), `lib/` (carrito, precio, mensaje de WhatsApp: funciones puras y testeadas), `data/` (repositorio de catálogo detrás de una interfaz) y `components/`.
- **Catálogo:**
  - MVP con datos locales tipados (JSON o TS) si son menos de unos 100 productos y los edita alguien técnico.
  - Si lo edita personal no técnico, se recomienda **un CMS headless existente** (p. ej. Sanity o Payload) en lugar de construir un backend propio.
  - El repositorio de datos aísla esa decisión.
- **Pagos futuros:** el precio de cliente nunca es fuente de verdad. Un futuro checkout recalcula en el servidor desde el catálogo. El modelo de pedido con estados (`borrador → pendiente_confirmacion → confirmado → enviado`, `cancelado`) se agrega solo cuando haya pedidos en el servidor.
- **Tests:** Vitest para `lib/` (subtotales, límites, mensaje, codificación) y Playwright para el flujo carrito → WhatsApp en móvil y escritorio.

## 8. Panel administrativo

Si se aprueba el CMS, el panel es el del CMS, con roles (administrador y editor) y autenticación. Permite:
- productos, fotos, categorías y marcas;
- precios y promociones con fecha de fin;
- disponibilidad;
- publicar y despublicar;
- configuración de la tienda (número de WhatsApp, textos de la barra superior, políticas).

## 9. Backlog de implementación (fase 2, en orden)

| # | Entrega | Incluye |
|---|---|---|
| 1 | Base del proyecto | Next.js + TS, tokens, fuentes, layout, header y footer, configuración central |
| 2 | Datos de catálogo | Modelo, repositorio, datos demo marcados, categorías |
| 3 | Catálogo | Listado, categoría, búsqueda, filtros, orden, estados vacío y carga |
| 4 | Detalle | Galería, precio, disponibilidad, especificaciones, relacionados, SEO del producto (JSON-LD `Product`) |
| 5 | Carrito | Store persistente, recálculo, límites, descontinuados, deshacer + tests |
| 6 | WhatsApp | Servicio de mensaje y enlace + tests de codificación, pantalla de pedido |
| 7 | Inicio | Secciones con datos reales del catálogo |
| 8 | Páginas informativas | Envíos y garantías, FAQ, contacto, legal (contenido de la tienda) |
| 9 | CMS / admin | Según la decisión de §7 |
| 10 | Calidad | Accesibilidad (WCAG AA), Lighthouse, imágenes optimizadas, sitemap y robots, documentación de configuración y despliegue |

## 10. Criterios de aceptación del diseño (esta fase)

- [ ] Identidad aprobada: nombre provisional, símbolo, paleta y tipografía.
- [ ] Las 5 pantallas prioritarias tienen una dirección visual consistente en móvil, tablet y escritorio.
- [ ] El acento verde solo aparece en acciones y detalles importantes.
- [ ] La tarjeta de producto incluye foto, marca, nombre, precio COP, precio anterior solo con promoción, disponibilidad real, "Ver detalles" y WhatsApp rápido.
- [ ] El flujo de WhatsApp no afirma confirmaciones y el mensaje contiene tienda, producto, referencia, cantidad, precio unitario, subtotal, consulta de envío e ID provisional.
- [ ] No hay valoraciones, ventas, testimonios, descuentos, garantías ni condiciones de envío inventados.
- [ ] Están identificados los datos pendientes de la tienda (lista §11).

## 11. Datos que necesitamos de la tienda

1. Nombre definitivo, logotipo (si existe), razón social y NIT.
2. Número de WhatsApp comercial y horario de atención.
3. Cobertura, transportadoras, tiempos y costos de envío.
4. Política de garantía por marca o tienda y proceso de reclamo.
5. Medios de pago aceptados.
6. Marcas con distribución o autorización (para mostrar logos).
7. Catálogo inicial: productos, precios, SKU, disponibilidad y fotos con derechos de uso.
8. Foto de hero autorizada (mín. 1600×1200).
9. Quién actualizará el catálogo y con qué frecuencia (decide CMS sí o no).
10. Textos legales: privacidad y términos.
11. Imagen de referencia de CD-R SDJ Colombia (no llegó en el mensaje).
