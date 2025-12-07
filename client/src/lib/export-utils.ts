import { format } from "date-fns";

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string; formatter?: (value: any, row: T) => string }[],
  filename: string
): void {
  if (!data || data.length === 0) {
    return;
  }

  const headers = columns.map((col) => col.header);
  
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value, row) : value;
      const stringValue = formatted != null ? String(formatted) : "";
      return `"${stringValue.replace(/"/g, '""')}"`;
    })
  );

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
