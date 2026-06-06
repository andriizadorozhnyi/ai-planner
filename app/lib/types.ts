export type TabKey = "capture" | "inbox" | "week";

export type Priority = "low" | "medium" | "high";

/** Time slot within a day. "HH:MM" 24-hour format. */
export interface Slot {
  start: string;
  end: string;
}

/** Pre-existing busy time on a given day (meeting, focus-block, lunch). */
export interface BusySlot extends Slot {
  id: string;
  /** ISO yyyy-mm-dd */
  day: string;
  title: string;
}

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
  /** AI-recommended time slot within `day`, computed against known busy time. */
  scheduledSlot?: Slot;
  done: boolean;
  /** @deprecated Pre-Sprint-2 flag — migrated to `day` on load. */
  today?: boolean;
  createdAt: number;
}
