"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API isn't in the standard TS DOM lib, so we type the bits we use.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface Options {
  lang?: string;
}

/**
 * Wraps the Web Speech API and exposes a stable `transcript` (committed
 * recognized text) plus `interim` (live preview).
 *
 * Why per-index replace (not append): Chrome on Android, under
 * `continuous: true`, repeatedly re-fires the same "final" result at the
 * same `resultIndex`, growing its content each time. Naively appending
 * each final chunk produces "Мені Мені дуже Мені дуже…" duplication.
 * Storing finals in a slot array and joining keeps the transcript stable
 * on both Android and desktop behaviors.
 */
export function useSpeechRecognition({ lang = "uk-UA" }: Options = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // One slot per `resultIndex` — last writer wins. Android Chrome rewrites
  // index 0 repeatedly; desktop Chrome advances the index normally. Both work.
  const finalsRef = useRef<string[]>([]);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimStr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) {
          finalsRef.current[i] = t; // REPLACE, do not append
        } else {
          interimStr += t;
        }
      }
      setTranscript(
        finalsRef.current.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      );
      setInterim(interimStr.trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Немає доступу до мікрофона. Дозволь його в браузері.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("Помилка розпізнавання. Спробуй ще раз.");
      }
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec || listening) return;
    // Fresh session — wipe prior finals so we don't carry over a previous run.
    finalsRef.current = [];
    setTranscript("");
    setInterim("");
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if already running — ignore
    }
  }, [listening]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalsRef.current = [];
    setTranscript("");
    setInterim("");
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return {
    supported,
    listening,
    /** Committed recognized text since the last start(). */
    transcript,
    /** Live preview of the currently-spoken phrase. */
    interim,
    error,
    start,
    stop,
    reset,
    toggle,
  };
}
