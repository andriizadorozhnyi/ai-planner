"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CaptureScreen from "./components/CaptureScreen";
import InboxScreen from "./components/InboxScreen";
import StartLights from "./components/StartLights";
import TabBar from "./components/TabBar";
import WeekScreen from "./components/WeekScreen";
import { addDaysISO, todayISO } from "./lib/due";
import type { BusySlot, Slot, Task, TabKey } from "./lib/types";
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
  const [busySlots, setBusySlots] = useLocalStorage<BusySlot[]>(
    "ai-planner.busySlots",
    [],
  );
  // Hours available per day — drives the realism warning. Same value across days.
  const [capacityHours, setCapacityHours] = useLocalStorage<number>(
    "ai-planner.capacityHours",
    8,
  );
  // Selected day in the Week tab. Defaults to today.
  const [selectedDay, setSelectedDay] = useState<string>(() => todayISO());
  // F1 start-lights intro — once per day. Starts false (no SSR flash), flipped
  // on in an effect if today's ritual hasn't played yet.
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("ai-planner.introDate") !== todayISO()) {
        setShowIntro(true);
      }
    } catch {
      // storage unavailable — just skip the intro
    }
  }, []);
  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem("ai-planner.introDate", todayISO());
    } catch {
      // ignore
    }
  };

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
    const today = todayISO();
    // Hand the model what we already know about today so it doesn't re-create
    // duplicate busy slots or double-book already-scheduled tasks.
    const todayContext = {
      busySlots: busySlots
        .filter((b) => b.day === today)
        .map((b) => ({ start: b.start, end: b.end, title: b.title })),
      scheduledTasks: tasks
        .filter((t) => t.day === today && t.scheduledSlot && !t.done)
        .map((t) => ({ title: t.title, slot: t.scheduledSlot! })),
    };

    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, todayContext }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Не вдалося розібрати.");

    const createdTasks: Task[] = (data.tasks ?? []).map(
      (t: {
        title: string;
        priority: Task["priority"];
        estimateMin?: number;
        due?: string | null;
        day?: string | null;
        scheduledSlot?: Slot | null;
      }) => ({
        id: newId(),
        title: t.title,
        source: text,
        priority: t.priority,
        estimateMin:
          typeof t.estimateMin === "number" ? t.estimateMin : undefined,
        due: typeof t.due === "string" && t.due ? t.due : undefined,
        day: typeof t.day === "string" && t.day ? t.day : undefined,
        scheduledSlot: t.scheduledSlot ?? undefined,
        done: false,
        createdAt: 0,
      }),
    );

    const createdSlots: BusySlot[] = (data.busySlots ?? []).map(
      (s: { day: string; start: string; end: string; title: string }) => ({
        id: newId(),
        day: s.day,
        start: s.start,
        end: s.end,
        title: s.title,
      }),
    );

    if (createdTasks.length === 0 && createdSlots.length === 0) return;

    if (createdTasks.length) setTasks((prev) => [...createdTasks, ...prev]);
    if (createdSlots.length) setBusySlots((prev) => [...createdSlots, ...prev]);

    // Where to land: any new content for today → Week@today. Otherwise Inbox.
    const anyForToday =
      createdTasks.some((t) => t.day === today) ||
      createdSlots.some((s) => s.day === today);
    if (anyForToday) {
      setSelectedDay(today);
      setTab("week");
    } else {
      setTab("inbox");
    }
  };

  const deleteBusySlot = (id: string) =>
    setBusySlots((prev) => prev.filter((s) => s.id !== id));

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
      {showIntro && <StartLights onDone={dismissIntro} />}
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
            busySlots={busySlots}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onToggle={toggleDone}
            onDeleteBusySlot={deleteBusySlot}
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
