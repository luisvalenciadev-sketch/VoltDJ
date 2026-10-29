import { parseRichText } from "@/lib/rich-text";

/** Texto de política escrito en el panel. React escapa todo: el formato solo sale de parseRichText. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRichText(text).map((b, i) =>
        b.type === "h" ? (
          <h2 key={i}>{b.text}</h2>
        ) : b.type === "ul" ? (
          <ul key={i}>
            {b.items.map((t, j) => (
              <li key={j}>{t}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </>
  );
}
