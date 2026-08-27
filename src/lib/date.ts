const fmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
const fmtNoYear = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });

/** ช่วงวันที่ของสัปดาห์ เช่น "1 – 5 มิ.ย. 2569" */
export function formatRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) return `${start.getDate()} – ${fmt.format(end)}`;
  if (sameYear) return `${fmtNoYear.format(start)} – ${fmt.format(end)}`;
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
