"use client";

import { usePathname } from "next/navigation";

/**
 * Encabezado y pie de la tienda, que no aplican al panel: allí la cinta de promociones, la
 * búsqueda y las categorías son ruido para quien está trabajando. El panel trae su propia barra.
 */
export function StoreChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : <>{children}</>;
}
