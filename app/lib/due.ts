import type { Task } from "./types";

/** Today as ISO yyyy-mm-dd (local). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS_SHORT = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];
const WEEKDAYS_LONG = [
  "Неділя",
  "Понеділок",
  "Вівторок",
  "Середа",
  "Четвер",
  "Пʼятниця",
  "Субота",
];

/** Add N days to an ISO date string, returning a new ISO date string. */
export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "пн", "вт"… for a given ISO date. */
export function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return WEEKDAYS_SHORT[d.getUTCDay()];
}

/** Long Ukrainian weekday name. */
export function weekdayLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return WEEKDAYS_LONG[d.getUTCDay()];
}

/** "15" (day-of-month) for an ISO date. */
export function dayOfMonth(iso: string): string {
  return iso.slice(8, 10);
}

/** "15 червня" — Ukrainian dd month for the headline subtitle. */
const MONTHS_GEN = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];
export function prettyDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_GEN[Number(iso.slice(5, 7)) - 1]}`;
}

/** True when task has a deadline strictly before today and isn't done. */
export function isOverdue(task: Task, today = todayISO()): boolean {
  return Boolean(task.due) && !task.done && task.due! < today;
}

/** True when task has any deadline at all. */
export function hasDue(task: Task): boolean {
  return Boolean(task.due);
}

/** Compact human label for a due date relative to today. */
export function formatDue(due: string, today = todayISO()): string {
  if (due === today) return "сьогодні";
  // Day diff: compute via UTC midnight to avoid DST drift.
  const t = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );
  const d = Date.UTC(
    Number(due.slice(0, 4)),
    Number(due.slice(5, 7)) - 1,
    Number(due.slice(8, 10)),
  );
  const diff = Math.round((d - t) / 86_400_000);
  if (diff === 1) return "завтра";
  if (diff === -1) return "вчора";
  if (diff > 1 && diff <= 6) {
    const weekdays = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];
    return weekdays[new Date(d).getUTCDay()];
  }
  // Older or further out: fall back to dd.mm
  const dd = due.slice(8, 10);
  const mm = due.slice(5, 7);
  return `${dd}.${mm}`;
}
