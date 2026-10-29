/**
 * Formato de texto de las políticas, pensado para quien escribe en el panel sin saber de código:
 * una línea que empieza con "## " es un subtítulo, las que empiezan con "- " forman una lista y una
 * línea en blanco separa párrafos. No admite HTML: todo se muestra como texto.
 */
export type RichBlock = { type: "h"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };

export function parseRichText(raw: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  for (const line of raw.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim())) {
    if (!line) {
      flush();
      continue;
    }
    const h = /^#{1,3}\s+(.+)$/.exec(line);
    const li = /^[-*•]\s+(.+)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ type: "h", text: h[1] });
    } else if (li) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") last.items.push(li[1]);
      else blocks.push({ type: "ul", items: [li[1]] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}
