export type TabKey = "capture" | "inbox" | "week";

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
  /** Deadline (ISO yyyy-mm-dd), if any (assigned by the AI parser). */
  due?: string;
  /** Day this task is scheduled on (ISO yyyy-mm-dd). Undefined → lives in Inbox. */
  day?: string;
  done: boolean;
  /** @deprecated Pre-Sprint-2 flag — migrated to `day` on load. */
  today?: boolean;
  createdAt: number;
}
