export function inr(amount: number): string {
  return "₹" + new Intl.NumberFormat("en-IN").format(Math.round(amount));
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function formatShortDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value + (value.length === 10 ? "T00:00:00" : "")) : value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function toISODate(d: Date): string {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function demoTransactionId(): string {
  const chars = "0123456789ABCDEF";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `DEMO-TXN-${out}`;
}

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Convert a slot label like "10:30 AM" plus a date into a Date object. */
export function slotToDate(dateISO: string, slot: string): Date {
  const [time, meridiem] = slot.split(" ");
  const parts = (time ?? "09:00").split(":");
  let hours = Number(parts[0] ?? 9);
  const minutes = Number(parts[1] ?? 0);
  if (meridiem?.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (meridiem?.toUpperCase() === "AM" && hours === 12) hours = 0;
  const d = new Date(dateISO + "T00:00:00");
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Alias used across the UI. */
export const formatCurrency = inr;
