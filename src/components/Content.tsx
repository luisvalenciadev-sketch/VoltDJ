import type { FaqItem } from "@/config/content";
import { Pending } from "./ui";

export function PolicyList({ items, placeholders }: { items: string[] | null; placeholders: string[] }) {
  return (
    <ul>
      {items ? items.map((t) => <li key={t}>{t}</li>) : placeholders.map((t) => <li key={t}><Pending>{t}</Pending></li>)}
    </ul>
  );
}

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.id} open={i === 0}>
          <summary>{f.q}</summary>
          <div>{f.a || <Pending>Respuesta pendiente</Pending>}</div>
        </details>
      ))}
    </div>
  );
}
