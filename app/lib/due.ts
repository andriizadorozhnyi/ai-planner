import type { Task } from "./types";

/** Today as ISO yyyy-mm-dd (local). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
