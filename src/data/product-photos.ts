import type { ProductImage } from "./types";

/**
 * Fotos del modelo exacto con licencia libre (Wikimedia Commons). La licencia
 * exige citar autor y licencia: la ficha del producto lo muestra.
 * Para agregar fotos propias: ponerlas en public/img/productos/ y registrarlas aquí sin `credit`.
 */
export const PRODUCT_PHOTOS: Record<string, ProductImage> = {
  "pioneer-dj-ddj-rx": {
    src: "/img/productos/pioneer-dj-ddj-rx.jpg", width: 1200, height: 815, fit: "contain",
    alt: "Controlador Pioneer DJ DDJ-RX encendido",
    credit: { name: "Jonn Leffmann", url: "https://commons.wikimedia.org/wiki/User:Jonn_Leffmann", source: "https://commons.wikimedia.org/wiki/File:Pioneer_DDJ-RX_DJ-Controller_(front)_with_computer_running_mixing_software_Rekordbox.jpg", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0" },
  },
  "pioneer-dj-ddj-400": {
    src: "/img/productos/pioneer-dj-ddj-400.jpg", width: 1200, height: 900, fit: "cover",
    alt: "Controlador Pioneer DJ DDJ-400 sobre un escritorio",
    credit: { name: "Nelsnelson", url: "https://commons.wikimedia.org/wiki/User:Nelsnelson", source: "https://commons.wikimedia.org/wiki/File:DDJ-400_on_a_desk_with_computers.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" },
  },
  "pioneer-dj-ddj-flx4": {
    src: "/img/productos/pioneer-dj-ddj-flx4.jpg", width: 1200, height: 675, fit: "contain",
    alt: "Controlador Pioneer DJ DDJ-FLX4",
    credit: { name: "Solomon203", url: "https://commons.wikimedia.org/wiki/User:Solomon203", source: "https://commons.wikimedia.org/wiki/File:Pioneer_DDJ-FLX4_at_Taipei_Media_School_booth_20250810.jpg", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0" },
  },
};
