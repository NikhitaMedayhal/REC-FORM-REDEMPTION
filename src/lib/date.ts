/**
 * Formats a date to "DD/MM/YYYY HH:mm:ss" in IST (Asia/Kolkata).
 * SQLite's datetime('now') stores naive UTC timestamps with no timezone
 * suffix (e.g. "2026-09-11 08:30:00"), so a bare 'Z' is appended before
 * parsing to make sure it's treated as UTC rather than local time.
 */
export function formatToIST(dateInput?: string | Date | null): string {
  if (!dateInput) return "";

  let date: Date;

  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    const raw = dateInput.trim();
    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
    const isoish = raw.includes("T") ? raw : raw.replace(" ", "T");
    date = new Date(hasTimezone ? isoish : `${isoish}Z`);
  }

  if (isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get(
    "minute"
  )}:${get("second")}`;
}
