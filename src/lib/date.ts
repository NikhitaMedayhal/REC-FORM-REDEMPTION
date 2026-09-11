/**
 * Derives a student's "year" (1-5) from their PESU semester string.
 *
 * Shared between the join form (for display/pre-fill only) and the
 * /api/apply backend route (for the authoritative, security-relevant
 * calculation). The backend must never trust a client-submitted year —
 * it always re-derives it from the semester in the verified JWT session.
 */
export function deriveYear(semester: string | undefined | null): string {
  if (!semester) return "";
  // Defensive: extract the first run of digits rather than requiring
  // the string to start with one, in case a raw PESU value like
  // "Sem-8" ever reaches here instead of the normalized "8".
  const match = semester.match(/\d+/);
  if (!match) return "";
  const sem = parseInt(match[0], 10);
  if (!sem || Number.isNaN(sem)) return "";
  const year = Math.ceil(sem / 2);
  return String(year);
}

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
