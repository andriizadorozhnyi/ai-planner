"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDone: () => void;
}

type Phase = "lighting" | "hold" | "go" | "out";

/**
 * Formula-1 start-lights intro. Five red lights illuminate left-to-right,
 * hold, then all extinguish at once → green "Погнали" → fade. Shown once per
 * day as a "charge up" ritual. Tap anywhere to skip. Respects reduced-motion.
 */
export default function StartLights({ onDone }: Props) {
  const [lit, setLit] = useState(0); // number of columns currently lit
  const [phase, setPhase] = useState<Phase>("lighting");
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      finish();
      return;
    }
    const step = 340; // ms between each light
    const t: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 5; i++) {
      t.push(setTimeout(() => setLit(i), i * step));
    }
    const allLit = 5 * step;
    t.push(setTimeout(() => setPhase("hold"), allLit + 120));
    // Lights out + GO (the real F1 "lights out and away we go")
    t.push(
      setTimeout(() => {
        setLit(0);
        setPhase("go");
      }, allLit + 750),
    );
    t.push(setTimeout(() => setPhase("out"), allLit + 1550));
    t.push(setTimeout(finish, allLit + 1950));
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={finish}
      role="button"
      aria-label="Пропустити заставку"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0E] transition-opacity duration-300 ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
      style={{ touchAction: "none" }}
    >
      {/* Light gantry — 5 columns, two lamps each (authentic F1) */}
      <div className="flex gap-3 sm:gap-4">
        {[0, 1, 2, 3, 4].map((col) => {
          const on = phase !== "go" && col < lit;
          const go = phase === "go";
          return (
            <div
              key={col}
              className="flex flex-col gap-2 rounded-2xl bg-black/60 p-2 ring-1 ring-white/5"
            >
              {[0, 1].map((row) => (
                <span
                  key={row}
                  className="h-9 w-9 rounded-full transition-all duration-150 sm:h-11 sm:w-11"
                  style={{
                    background: go
                      ? "#19E07A"
                      : on
                        ? "#FF2A1A"
                        : "#1c1c22",
                    boxShadow: go
                      ? "0 0 24px 4px rgba(25,224,122,0.7)"
                      : on
                        ? "0 0 22px 3px rgba(255,42,26,0.65)"
                        : "inset 0 0 0 1px rgba(255,255,255,0.04)",
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Caption */}
      <div className="mt-10 h-8 text-center">
        {phase === "go" ? (
          <p className="text-2xl font-semibold tracking-tight text-[#19E07A]">
            Погнали 🏁
          </p>
        ) : (
          <p className="text-sm font-medium tracking-tight text-white/45">
            Заряджаємось на день…
          </p>
        )}
      </div>

      <p className="absolute bottom-10 text-xs text-white/25">
        тапни, щоб пропустити
      </p>
    </div>
  );
}
