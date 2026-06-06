export type TabKey = "capture" | "inbox" | "today";

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  /** Raw text the task was parsed from. */
  source?: string;
  /** Priority assigned by the AI parser. */
  priority?: Priority;
  /** Estimated time to complete, in minutes (assigned by the AI parser). */
  estimateMin?: number;
  /** Deadline as ISO yyyy-mm-dd, if any (assigned by the AI parser). */
  due?: string;
  done: boolean;
  /** Marks the task as scheduled for the Today checklist. */
  today: boolean;
  createdAt: number;
}
