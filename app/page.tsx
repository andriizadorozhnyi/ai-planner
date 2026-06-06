"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CaptureScreen from "./components/CaptureScreen";
import InboxScreen from "./components/InboxScreen";
import TabBar from "./components/TabBar";
import WeekScreen from "./components/WeekScreen";
import { addDaysISO, todayISO } from "./lib/due";
import type { Task, TabKey } from "./lib/types";
import { useLocalStorage } from "./lib/useLocalStorage";

let counter = 0;
function newId() {
  // Good enough for client-only ids; avoids SSR Date.now mismatch noise.
  counter += 1;
  return `${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("capture");
  const [tasks, setTasks] = useLocalStorage<Task[]>("ai-planner.tasks", []);
  // Hours available per day — drives the realism warning. Same value across days.
  const [capacityHours, setCapacityHours] = useLocalStorage<number>(
    "ai-planner.capacityHours",
    8,
  );
  // Selected day in the Week tab. Defaults to today.
  const [selectedDay, setSelectedDay] = useState<string>(() => todayISO());

  // One-time migration: pre-Sprint-2 tasks carried `today: boolean`. Convert
  // to the new `day` field, then strip the legacy flag.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    const today = todayISO();
    setTasks((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (typeof t.today === "boolean" && t.day === undefined) {
          changed = true;
          const day = t.today ? today : undefined;
          // Drop the deprecated field entirely.
          const { today: _drop, ...rest } = t;
          return { ...rest, day } as Task;
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [setTasks]);

  const inboxTasks = useMemo(() => tasks.filter((t) => !t.day), [tasks]);

  /** Sends the brain-dump to the AI parser and turns the result into tasks. */
  const handleCapture = async (text: string) => {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Не вдалося розібрати.");

    const created: Task[] = (data.tasks ?? []).map(
      (t: {
        title: string;
        priority: Task["priority"];
        estimateMin?: number;
        due?: string | null;
        day?: string | null;
      }) => ({
        id: newId(),
        title: t.title,
        source: text,
        priority: t.priority,
        estimateMin:
          typeof t.estimateMin === "number" ? t.estimateMin : undefined,
        due: typeof t.due === "string" && t.due ? t.due : undefined,
        day: typeof t.day === "string" && t.day ? t.day : undefined,
        done: false,
        createdAt: 0,
      }),
    );
    if (created.length === 0) return;
    setTasks((prev) => [...created, ...prev]);

    // Where to land: if any were scheduled to today, jump to Week (on today).
    // Otherwise show Inbox so the user can dispatch them.
    const today = todayISO();
    if (created.some((t) => t.day === today)) {
      setSelectedDay(today);
      setTab("week");
    } else {
      setTab("inbox");
    }
  };

  const scheduleTask = (id: string, day: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, day } : t)),
    );

  const deleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const toggleDone = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );

  /** Carry every undone task from `fromDay` to the day after. */
  const moveAllToTomorrow = (fromDay: string) => {
    const next = addDaysISO(fromDay, 1);
    setTasks((prev) =>
      prev.map((t) =>
        t.day === fromDay && !t.done ? { ...t, day: next } : t,
      ),
    );
  };

  /** Pull every undone task from past days onto today. */
  const catchUpOverdue = () => {
    const today = todayISO();
    setTasks((prev) =>
      prev.map((t) =>
        t.day && t.day < today && !t.done ? { ...t, day: today } : t,
      ),
    );
  };

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col">
      <section className="min-h-0 flex-1">
        {tab === "capture" && <CaptureScreen onCapture={handleCapture} />}
        {tab === "inbox" && (
          <InboxScreen
            tasks={inboxTasks}
            onSchedule={scheduleTask}
            onDelete={deleteTask}
            onGoToCapture={() => setTab("capture")}
          />
        )}
        {tab === "week" && (
          <WeekScreen
            tasks={tasks}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onToggle={toggleDone}
            onMoveAllToTomorrow={moveAllToTomorrow}
            onCatchUpOverdue={catchUpOverdue}
            capacityHours={capacityHours}
            onCapacityChange={setCapacityHours}
          />
        )}
      </section>

      <TabBar active={tab} onChange={setTab} inboxCount={inboxTasks.length} />
    </main>
  );
}
