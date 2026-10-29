"use client";

import { createContext, useContext } from "react";

/** Datos de la tienda que necesitan los componentes de cliente (carrito, pedido, botones de WhatsApp). */
export interface StoreInfo {
  name: string;
  /** Solo dígitos; vacío = WhatsApp no configurado. */
  whatsappNumber: string;
  orderIdPrefix: string;
}

const StoreInfoContext = createContext<StoreInfo>({ name: "", whatsappNumber: "", orderIdPrefix: "PD" });

/** El layout lo llena con lo guardado en el panel: así un cambio de número llega también al carrito. */
export function StoreInfoProvider({ value, children }: { value: StoreInfo; children: React.ReactNode }) {
  return <StoreInfoContext.Provider value={value}>{children}</StoreInfoContext.Provider>;
}

export const useStoreInfo = () => useContext(StoreInfoContext);
