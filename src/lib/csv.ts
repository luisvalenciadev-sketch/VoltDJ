/**
 * CSV como lo abre y lo guarda Excel en Colombia: separador ";" (la coma es el decimal) o ",",
 * comillas dobles para campos con separadores o saltos de línea y BOM UTF-8 para que las tildes se vean bien.
 */

/** Detecta el separador mirando la primera línea fuera de comillas. */
export function detectDelimiter(text: string): ";" | "," | "\t" {
  let inQuotes = false;
  const count = { ";": 0, ",": 0, "\t": 0 };
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && ch in count) count[ch as keyof typeof count]++;
  }
  if (count["\t"] > count[";"] && count["\t"] > count[","]) return "\t";
  return count[";"] >= count[","] && count[";"] > 0 ? ";" : ",";
}

/** Filas como arreglos de texto. Tolera BOM, CRLF, comillas escapadas ("") y saltos dentro de comillas. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    // Una comilla suelta en medio de un campo sin comillas (18") es parte del texto, como lo trata Excel.
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Las filas totalmente vacías (líneas en blanco al final) no cuentan.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Filas como objetos por encabezado. `line` es el número de línea en Excel (el encabezado es la 1). */
export function parseCsvObjects(input: string): { headers: string[]; rows: { line: number; values: Record<string, string> }[] } {
  const [head = [], ...body] = parseCsv(input);
  const headers = head.map((h) => h.trim());
  return {
    headers,
    rows: body.map((cells, i) => ({
      line: i + 2,
      values: Object.fromEntries(headers.map((h, j) => [h, (cells[j] ?? "").trim()])),
    })),
  };
}

const needsQuotes = /[";,\n\r\t]/;
const cell = (v: string | number | boolean | null | undefined) => {
  const s = v == null ? "" : String(v);
  return needsQuotes.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV con ";" y BOM, listo para abrir con doble clic en Excel en español. */
export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
