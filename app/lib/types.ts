export type TabKey = "capture" | "inbox" | "today";

export interface Task {
  id: string;
  title: string;
  /** Raw text the task was parsed from (for future AI use). */
  source?: string;
  done: boolean;
  /** Marks the task as scheduled for the Today checklist. */
  today: boolean;
  createdAt: number;
}
