# ccmtiendadelsonido.com — Taste

Fuente: https://ccmtiendadelsonido.com/ · capturado 2026-10-29 · 1440×900 y 390×844 · página de 10 712 px · inicio + ficha de producto + categoría.
Plataforma: WordPress 7.1 + WooCommerce, con Addi, Sistecrédito, Mercado Pago, Trustindex (reseñas de Google), píxeles de Meta y TikTok, Google Tag Manager y Microsoft Clarity.
Uso en VOLT DJ: **solo principios**. No se toman colores, tipografía, logotipos, fotos ni textos de la marca.

## Design Map

| Categoría | Medida |
| --- | --- |
| Fondo de interfaz | `#FFFFFF` (40 % del área), `#000000` (17 %, barra de menú y bandas "En vitrina"), `#191818` (8,5 %), `#F2F2F0` (4,9 %), tinte `rgba(0,0,0,.04)` en fondos de foto (8,9 %) |
| Acento | rojo `#E60000`: precios de vitrina, etiquetas `% OFF`, "Comprar ahora", cuenta regresiva (0,3 % del área, ~28 nodos) |
| Color funcional | verde `#00A650` en "3 cuotas de $X sin interés" (96 nodos de texto); azul Addi en banda de ancho completo |
| Texto | `#191919` (64 nodos), `#000000` (47), blanco sobre negro (139) |
| Tipografía | una sola familia: Founder Grotesk CCM (~2 900 nodos) + `ui-monospace` para la cuenta regresiva y fechas (33) |
| Pesos | 500 dominante (432 nodos), 400 (134), 700 (42), 600 (36) |
| Tamaños | 13–18 px en catálogo (14 px: 106, 13 px: 102, 15 px: 78, 18 px: 73); títulos de sección 20,9 px / 500; cifras de vitrina ~70 px / 800 en rojo; precios de vitrina ~36 px / 800 |
| Radios | 12 px (93, tarjetas), 50 % (65, botones de favorito y carrito), 4 px (58, etiquetas), 24 px (44), 100 px (35, píldoras) |
| Sombras | `0 1px 3px rgba(0,0,0,.15)` (32); doble capa `0 8px 20px rgba(18,18,18,.12), 0 2px 6px rgba(18,18,18,.08)` (9) |
| Imágenes | héroe 2,03:1 en carrusel; miniaturas de producto 1:1 sobre gris; videos verticales 9:16 |
| Grilla | contenedor de 1 344 px (48 px de margen a 1 440); mosaico de 4 columnas de 325,5 px con 14 px de separación |
| Espaciado | base de 4 px irregular: 10 (232), 8 (172), 4 (153), 6 (152), 24 (118), 20 (77), 16 (55) |
| Movimiento | `transform 0.4s`, `box-shadow 0.28s`; respeta `prefers-reduced-motion` y usa `:focus-visible` |

## Taste DNA

### 1. La cifra técnica y el precio son el titular
- **Trigger:** vender cabinas, parlantes y controladores a un comprador que compara por pulgadas, vatios y canales.
- **Decision:** en "En vitrina" el titular de cada tarjeta es una especificación (`18"`, `120W`, `2CH`, `6CH`) a ~70 px / 800 en `#E60000`, y el precio repite ese tratamiento a ~36 px. Prefieren eso a un titular aspiracional o a una foto de ambiente.
- **Reason:** quien compra un parlante de 18" busca esa cifra antes que el modelo; ponerla a 70 px responde la primera pregunta sin leer.
- **Evidence:** mosaico de 4 columnas (325,5 px, 14 px de separación) con fondo negro; el rojo solo aparece en cifras, precios y descuentos (0,3 % del área).

### 2. La cuota va primero; el total, después
- **Trigger:** los tickets van de $135.000 a más de $4.500.000 en un mercado sin costumbre de pagar todo con tarjeta.
- **Decision:** cada tarjeta muestra "3 cuotas de $X sin interés" en verde `#00A650`. Hay una banda de Addi a todo el ancho en el inicio, y en la ficha los recuadros de Sistecrédito y Addi van antes que "Agregar al carrito". Prefieren eso a mostrar solo el total.
- **Reason:** $1.470.000 frena; "3 cuotas de $490.000" se compara con un sueldo mensual y vuelve alcanzable el equipo.
- **Evidence:** 96 nodos de texto en verde; el texto de cuotas aparece en ofertas, más vendidos y relacionados; en la ficha hay dos recuadros de financiación entre el precio y los botones.

### 3. El sonido se muestra con personas de la tienda, no con fotos de estudio
- **Trigger:** el producto es sonido y no se puede mostrar en una foto.
- **Decision:** la sección "Mira cómo suenan" muestra un carrusel de videos verticales 9:16 grabados por los asesores en el local, con subtítulos quemados al estilo Reels, y deja de lado las fotos de ambiente de stock.
- **Reason:** ver a un asesor con camiseta de la marca probando el equipo en la tienda física genera confianza en una compra de $500.000 o más que se hace sin ver al vendedor.
- **Evidence:** 5 tarjetas de video de 255 px de ancho visibles con botón de reproducir; complementos de confianza con 132 reseñas de Google (5 estrellas, Trustindex), dirección del local en el pie de página y la página "Tiendas" en el menú.

### 4. Restricción: una familia, un peso, un rojo
- **Trigger:** un catálogo con decenas de marcas, cada una con su logo y sus colores.
- **Decision:** una sola familia (Founder Grotesk CCM) en peso 500 para casi todo, sin pareja de letra de display, y un solo rojo como acento. La jerarquía se arma con tamaño (13 → 70 px) en lugar de mezclar tipografías.
- **Reason:** los logos de AlphaTheta, Pioneer DJ, MTE y PRY ya traen su propia letra; si la interfaz sumara otra display, la página sería una pelea de marcas.
- **Evidence:** ~2 900 nodos en una sola familia; 432 de 644 nodos en peso 500; el único acento cromático propio es `#E60000`. El verde de cuotas y el azul de Addi son funcionales o de un aliado.

## Lo que no conviene copiar

- Un aviso de cookies a pantalla completa (615 × 355 px con velo del 60 %) que tapa el inicio y la ficha en computador y en celular.
- Banners con el texto quemado en la imagen ("HALLOWEN", con error de ortografía): no se pueden leer con lector de pantalla, no se traducen y no se pueden editar sin un diseñador.
- Tres capas flotantes a la vez en la ficha (cookies, ventana de Mercado Pago y burbuja de WhatsApp) encima del botón de compra.
- Formato de precio mezclado: `$610,000` con coma en tarjetas y `$121.702` con punto en financiación.
