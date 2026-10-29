# alphatheta.com — Taste

Fuente: https://alphatheta.com/en/ · capturado 2026-10-29 · 1440×900 · página de 16 982 px · una sola página.
Uso en VOLT DJ: **solo principios**. No se toman colores, tipografía, logotipos, fotos ni textos de la marca.

## Design Map

| Categoría | Medida |
| --- | --- |
| Fondo de interfaz | `#F8F8F8` (77 % del área), `#FFFFFF` (7 %), `#EEEEEE` (6 %) |
| Texto | `#1D1D1D` (132 nodos), `#000000` (31), gris `#808080` (19) |
| Tipografía | Helvetica Neue en 748 de 774 nodos; peso 400 en 182 de 221; títulos de sección 48 px / 400 / +0.96 px |
| Tamaños | 14 px dominante (115), 16 px (39), 40–48 px para titulares |
| Radios | 3 px (12) y 4 px (7); botones a 0 px |
| Sombras | ninguna |
| Imágenes clave | 2:1 (héroes) y 2.9:1 (banners); miniaturas 1:1 |
| Separación entre secciones | 175 px entre bloques; 30 px entre visuales consecutivos (tira de carteles) |
| Movimiento | `transform, opacity 0.7s ease-out` (20 elementos, aparición al hacer scroll); carrusel `transform 500ms ease`; 0 `<canvas>`, 0 WebGL, 0 elementos con `perspective` |

## Taste DNA

### 1. La interfaz no tiene color; el producto sí
- **Trigger:** una marca de hardware cuyo catálogo cambia de color en cada lanzamiento.
- **Decision:** UI en grises (`#F8F8F8` / `#1D1D1D`), sin sombras, peso 400 casi siempre; el color aparece solo dentro de los visuales del producto.
- **Reason:** si la interfaz tuviera acento propio competiría con cada campaña; neutra, cada producto trae su paleta sin chocar.
- **Evidence:** 0 sombras, 2 radios (3/4 px), el único rosa `#E6358A` ocupa el 0.1 % del área.
- **Restraint:** renuncian a un color de marca en botones y enlaces (botones negros, 0 px de radio) a cambio de que el producto sea siempre lo más saturado de la pantalla.

### 2. El producto como cartel: campo de color saturado + objeto inclinado
- **Trigger:** mostrar un equipo negro y rectangular que, de frente, parece una caja más.
- **Decision:** cada producto ocupa una franja 2:1 con su propio campo de color (degradado naranja→amarillo, negro con onda espectral) y el equipo rotado unos −25°, desbordando el marco.
- **Reason:** el ángulo de 3/4 revela volumen y controles; el campo de color separa un producto del siguiente sin necesidad de bordes.
- **Evidence:** visuales 2:1 apilados con 30 px de separación; el modelo en tipografía muy pesada junto al objeto.

### 3. El 3D se renderiza, no se calcula en el navegador
- **Trigger:** tener la sensación de 3D sin pagar el costo de WebGL en un sitio de catálogo.
- **Decision:** renders prerenderizados; el único movimiento es aparecer al hacer scroll (0.7 s) y el carrusel.
- **Reason:** la imagen carga rápido y se ve igual en cualquier equipo; el impacto lo carga la fotografía.
- **Evidence:** 0 canvas, 0 transformaciones 3D en el DOM, scripts limitados a slick + analítica.

### 4. Ritmo de cartelera
- **Trigger:** una portada que es básicamente una lista de lanzamientos.
- **Decision:** 175 px entre bloques de contenido, 30 px entre carteles consecutivos.
- **Reason:** los carteles pegados se leen como una tira continua; el aire grande marca el cambio de tema.

## Cómo se tradujo a VOLT DJ

| Principio | Implementación propia |
| --- | --- |
| UI neutra, color en el producto | El lima queda para la acción principal; los campos de color viven solo en la vitrina |
| Producto como cartel | `.billboard`: campo de color propio por producto, foto recortada en pose de 3/4 |
| 3D prerenderizado | Aquí sí es 3D real (perspectiva CSS sobre fotos sin fondo), porque las fotos son frontales y no hay renders: el ángulo se construye en vivo |
| Ritmo de cartelera | Bandas con 16 px de separación; secciones a hasta 120 px |
