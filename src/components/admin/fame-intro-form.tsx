"use client";
// 화면 연출(admin/effects)의 명예의 전당 1위 인트로 판. 보여 주는 때(셋 중 하나)와 화면 전체에 머무는 시간을 고르고 저장한다.
//
// 고른 값은 누르는 즉시 판에 그려지고(로컬 상태), 저장은 단추로 한 번에 보낸다 — 슬라이더를 끄는 동안 저장이 수십 번 나가면 안 된다.
// 저장이 실패하면 마지막으로 저장된 값으로 되돌린다(AGENTS.md 6장 "실패하면 되돌린다").
// 검증은 서버와 같은 스키마(lib/indie/fame-intro)다 — 범위 밖 값은 단추를 누르기 전에 막는다.
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { cn } from "@/lib/cn";
import {
  FAME_INTRO_ADMIN_MESSAGES as M,
  FAME_INTRO_HOLD_MAX_MS,
  FAME_INTRO_HOLD_MIN_MS,
  FAME_INTRO_HOLD_STEP_MS,
  FAME_INTRO_MODES,
  fameIntroSettingsSchema,
  type FameIntroSettings,
} from "@/lib/indie/fame-intro";
import { ROUTES } from "@/lib/routes";
import { saveFameIntroAction } from "@/app/(admin)/admin/effects/actions";

const MS_PER_SECOND = 1000;

export function FameIntroForm({ initial }: { initial: FameIntroSettings }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = value.mode !== saved.mode || value.holdMs !== saved.holdMs;
  const valid = fameIntroSettingsSchema.safeParse(value).success;

  const save = () => {
    const next = value;
    setNote(null);
    start(async () => {
      const r = await saveFameIntroAction(next);
      if (r.ok) {
        setSaved(next);
        setNote({ tone: "success", text: M.saved });
      } else {
        setValue(saved);
        setNote({ tone: "error", text: r.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13.5px] font-semibold text-ink">{M.modeLabel}</legend>
        {FAME_INTRO_MODES.map((m) => (
          <label
            key={m}
            className={cn(
              "press flex min-h-[var(--touch-target)] cursor-pointer items-start gap-3 rounded-[var(--radius-md)] px-3.5 py-3 shadow-hair transition-colors duration-fast",
              value.mode === m ? "bg-acc-soft shadow-[inset_0_0_0_1.5px_var(--acc)]" : "bg-surface hover:bg-surface-2",
            )}
          >
            <input type="radio" name="fame-intro-mode" value={m} checked={value.mode === m} onChange={() => setValue((v) => ({ ...v, mode: m }))} className="mt-1 size-4 accent-[var(--acc)]" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-bold text-ink">{M.modeLabels[m]}</span>
              <span className="text-[12.5px] text-mut">{M.modeHints[m]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className={cn("flex flex-col gap-2 transition-opacity duration-fast", value.mode === "off" && "opacity-50")}>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="fame-intro-hold" className="text-[13.5px] font-semibold text-ink">
            {M.holdLabel}
          </label>
          <span className="text-[15px] font-extrabold tabular-nums text-acc" aria-live="polite">
            {M.seconds(value.holdMs / MS_PER_SECOND)}
          </span>
        </div>
        <input
          id="fame-intro-hold"
          type="range"
          min={FAME_INTRO_HOLD_MIN_MS}
          max={FAME_INTRO_HOLD_MAX_MS}
          step={FAME_INTRO_HOLD_STEP_MS}
          value={value.holdMs}
          disabled={value.mode === "off"}
          onChange={(e) => setValue((v) => ({ ...v, holdMs: Number(e.target.value) }))}
          aria-describedby="fame-intro-hold-hint"
          className="h-[var(--touch-target)] w-full accent-[var(--acc)]"
        />
        <p id="fame-intro-hold-hint" className="text-[12.5px] text-dim">
          {M.holdHint(FAME_INTRO_HOLD_MIN_MS / MS_PER_SECOND, FAME_INTRO_HOLD_MAX_MS / MS_PER_SECOND)}
        </p>
      </div>

      {note && <FormMessage tone={note.tone}>{note.text}</FormMessage>}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="accent" onClick={save} disabled={!dirty || !valid} loading={pending} loadingLabel={M.saving}>
          {M.save}
        </Button>
        <a href={ROUTES.hallOfFame} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary" })}>
          {M.preview}
          <span className="sr-only">{M.newWindow}</span>
        </a>
      </div>
    </div>
  );
}
