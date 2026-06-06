"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";

interface Props {
  /** Hands the raw brain-dump off to be turned into tasks by the AI. */
  onCapture: (text: string) => Promise<void>;
}

function join(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return `${a.replace(/\s+$/, "")} ${b}`.trim();
}

export default function CaptureScreen({ onCapture }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechRecognition({ lang: "uk-UA" });
  // Snapshot of textarea content when the user started dictating.
  // Live text shown = baseline + speech.transcript — single source of truth.
  const baselineRef = useRef("");

  useEffect(() => {
    if (!speech.listening) return;
    setText(join(baselineRef.current, speech.transcript));
  }, [speech.listening, speech.transcript]);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    speech.stop();
    speech.reset();
    setBusy(true);
    setError(null);
    try {
      await onCapture(trimmed);
      setText("");
      baselineRef.current = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Щось пішло не так.");
    } finally {
      setBusy(false);
    }
  };

  const onMic = () => {
    if (busy) return;
    if (!speech.supported) {
      setError("Цей браузер не підтримує голосовий ввід. Спробуй Chrome або Safari.");
      return;
    }
    setError(null);
    if (speech.listening) {
      speech.stop();
      baselineRef.current = text;
    } else {
      baselineRef.current = text;
      speech.start();
    }
  };

  const shownError = error ?? speech.error;
  const hasText = text.trim().length > 0;

  return (
    <div className="flex h-full flex-col px-5 pt-8">
      {/* Hierarchy level 1 — big, tight, brand-tracking */}
      <h1 className="text-[34px] leading-none font-medium tracking-tight">
        Що в голові?
      </h1>
      <p className="mt-2 text-[15px] leading-snug text-(--color-muted)">
        {speech.listening
          ? "Слухаю… говори, я записую."
          : "Вивантаж усе одним потоком — голосом або текстом."}
      </p>

      {/* Capture field — full-bleed, generous padding, live interim below the text */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-soft transition-colors focus-within:border-(--color-accent)/40">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!speech.listening) baselineRef.current = e.target.value;
          }}
          disabled={busy}
          placeholder="Подзвонити в банк, купити воду, дедлайн по звіту в пʼятницю…"
          autoFocus
          // Textarea fills the wrapper; the wrapper owns the visible focus state.
          // Suppress :focus-visible here to avoid a doubled red ring.
          className="min-h-0 flex-1 resize-none rounded-2xl bg-transparent p-5 text-[18px] leading-relaxed text-(--color-text) placeholder:text-(--color-caption) outline-none focus-visible:outline-none disabled:opacity-60"
        />
        {speech.listening && speech.interim && (
          <p className="px-5 pb-4 text-[18px] italic leading-relaxed text-(--color-muted)">
            {speech.interim}
          </p>
        )}
      </div>

      {shownError && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-(--color-accent)/30 bg-(--color-accent)/10 px-4 py-3 text-sm font-medium text-(--color-text)"
        >
          {shownError}
        </p>
      )}

      {/* Thumb-zone CTAs: 56px tall, side-by-side, generous gap */}
      <div className="flex items-center gap-3 py-5">
        <button
          type="button"
          aria-label={speech.listening ? "Зупинити запис" : "Диктувати голосом"}
          aria-pressed={speech.listening}
          onClick={onMic}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition active:scale-95 ${
            speech.listening
              ? "bg-(--color-accent) text-white"
              : "border border-(--color-border) bg-(--color-surface) text-(--color-text) active:bg-(--color-surface-2)"
          }`}
        >
          <MicIcon active={speech.listening} />
        </button>

        <button
          type="button"
          onClick={save}
          disabled={!hasText || busy}
          className="h-14 flex-1 rounded-2xl bg-(--color-accent) text-[17px] font-medium tracking-tight text-white shadow-cta transition active:scale-[0.98] active:bg-(--color-accent-press) disabled:opacity-30 disabled:shadow-none"
        >
          {busy ? "Розбираю…" : "Розібрати"}
        </button>
      </div>
    </div>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={active ? "" : ""}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
