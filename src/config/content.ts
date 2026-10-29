/**
 * Textos editoriales reutilizados en varias páginas. Una respuesta `null`
 * significa que el dato depende de la tienda y se muestra como pendiente.
 */
export interface FaqItem {
  q: string;
  a: string | null;
  pendingLabel?: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "¿Cómo hago un pedido?",
    a: "Agrega productos al carrito, revisa el resumen y pulsa “Enviar pedido por WhatsApp”. Se abre una conversación con el detalle ya escrito. El pedido queda confirmado cuando un asesor te responda con disponibilidad, envío y forma de pago.",
  },
  {
    q: "¿El precio del carrito es el precio final?",
    a: "El subtotal es una estimación con los precios publicados y no incluye envío. El asesor confirma el valor final antes de que pagues.",
  },
  {
    q: "¿Tengo que pagar en la página?",
    a: "No. La tienda no cobra en línea: acuerdas la forma de pago con el asesor por WhatsApp.",
  },
  {
    q: "¿Qué significa “bajo pedido”?",
    a: "Que el producto no está en inventario inmediato y se solicita al proveedor. El asesor te confirma el tiempo de llegada antes de cerrar la compra.",
  },
  {
    q: "¿Necesito crear una cuenta?",
    a: "No. El carrito se guarda en este navegador y no pedimos datos personales en la página.",
  },
  { q: "¿Qué formas de pago aceptan?", a: null, pendingLabel: "Medios de pago aceptados" },
  { q: "¿Hacen envíos a todo el país?", a: null, pendingLabel: "Cobertura y tiempos de envío" },
  { q: "¿Los productos tienen garantía?", a: null, pendingLabel: "Política de garantía" },
];
