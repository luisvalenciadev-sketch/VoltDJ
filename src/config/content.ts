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
  { q: "¿Los equipos son nuevos?", a: "Sí, todos los equipos del catálogo son nuevos." },
  { q: "¿Puedo cambiar o devolver un producto?", a: "Sí, dentro de los 3 días siguientes a la entrega. Escríbenos por WhatsApp con tu número de pedido para gestionarlo." },
  { q: "¿Qué formas de pago aceptan?", a: "Transferencia bancaria. El asesor te comparte los datos por WhatsApp cuando confirme tu pedido." },
  { q: "¿Hacen envíos a todo el país?", a: "Sí, enviamos a todo Colombia. El costo y el tiempo de entrega se confirman por WhatsApp según tu ciudad." },
  { q: "¿Los productos tienen garantía?", a: "Sí, los equipos tienen 12 meses de garantía. Para solicitarla, escríbenos por WhatsApp con tu número de pedido." },
];
