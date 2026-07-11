function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[";,\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadCsv(filename: string, rows: unknown[][]) {
  if (typeof document === "undefined") return false;
  const content = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
