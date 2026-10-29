"use client";
// 가격 알림 폼/컨트롤 (클라이언트). Server Action은 src/app/(user)/alerts/actions.ts
// 리디자인: 플랫폼은 select 대신 칩 버튼, 최소 할인율은 숫자 입력 대신 슬라이더.
// 2026-10-07 고도화: 기준을 둘 중 하나로 고른다(할인율 | 목표가, lib/alerts/condition). 이미 만든 알림이 있으면
// 그 값으로 폼을 채워 "조건 바꾸기" 가 된다 — 저장은 같은 게임, 플랫폼 행을 덮는다(services/alerts 의 createAlert).
import { useActionState, useState } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { createAlertAction, type ActionState } from "@/app/(user)/alerts/actions";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { PLATFORM_LABEL } from "@/lib/format";
import { PLATFORM_ORDER } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { Clamp } from "@/components/ui/tooltip";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { AlertDefaults } from "@/lib/onboarding/personal";
import { PERSONAL_MESSAGES } from "@/lib/onboarding/messages";
import { ALERT_MESSAGES as AM } from "@/lib/alerts/messages";
import type { AlertMode } from "@/lib/alerts/condition";

export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체 플랫폼" },
  ...PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORM_LABEL[p] })),
];

const DEFAULT_MIN_DISCOUNT = 50;
/** PLATFORM_OPTIONS 의 "전체 플랫폼" 값. 서버 액션도 같은 글자를 본다(actions 의 readPlatforms) */
const ALL = "all";
/** 목표가 칸 자릿수 상한. 8자리면 9,999만 원 — 게임 값으로는 넉넉하다(앞 판의 slice(0, 8) 과 같다) */
const TARGET_DIGITS_MAX = 8;

/** 이미 만든 알림의 값. 있으면 폼이 "조건 바꾸기" 로 열린다 */
export type AlertInitial = { platform: string; mode: AlertMode; minDiscountPct: number | null; targetPrice: number | null };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending} loadingLabel={pendingLabel}>
      {label}
    </Button>
  );
}

export function StatusLine({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p aria-live="polite" className={`text-[12.5px] ${state.ok ? "text-ok" : "text-danger"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}

type FormGame = { id: string; slug: string; title: string; coverUrl?: string | null; priceNote?: string | null };

/**
 * 새 알림 생성 폼 — /alerts?game=<slug> 로 진입했을 때 상단에 노출.
 *
 * 2026-10-27(사용자: "알림 한 영역이 너무 많이 공간을 차지한다", "알림 만들기 단추를 올리고", "플랫폼도 예쁘게, 다중 선택",
 * "조건에 맞으면 웹푸시로 한 번 보내요 문구 지우고", "모션도 없다"):
 * - 머리 한 줄에 게임과 저장 단추를 같이 세운다. 바닥의 저장 줄(규칙 문구 + 단추)을 걷어 판 높이가 한 줄 준다
 * - 플랫폼은 여럿 고른다. "전체" 와 개별은 서로 배타다 — 둘을 같이 저장하면 같은 할인에 알림이 두 번 온다(actions 의 readPlatforms)
 * - 고른 칩은 체크가 톡 튀며 켜지고(animate-pick), 판은 떠오르며 들어온다
 */
export function AlertForm({ game, defaults, initial }: { game: FormGame; defaults?: AlertDefaults; initial?: AlertInitial }) {
  const [state, formAction, submitting] = useActionState(createAlertAction, null);
  // 첫 값 순서: 이미 만든 알림 > 온보딩 취향(설계 §9 의 4회차) > 폼의 기본값
  const [platforms, setPlatforms] = useState<string[]>([initial?.platform ?? defaults?.platform ?? ALL]);
  const [mode, setMode] = useState<AlertMode>(initial?.mode ?? "discount");
  const [minDiscount, setMinDiscount] = useState(initial?.minDiscountPct ?? defaults?.minDiscountPct ?? DEFAULT_MIN_DISCOUNT);
  const [target, setTarget] = useState(initial?.targetPrice ? initial.targetPrice.toLocaleString("ko-KR") : "");
  const fromProfile = !initial && defaults?.minDiscountPct != null;

  const togglePlatform = (value: string) =>
    setPlatforms((cur) => {
      if (value === ALL) return [ALL];
      const without = cur.filter((p) => p !== ALL && p !== value);
      const next = cur.includes(value) ? without : [...without, value];
      // 개별을 다 풀면 전체로 돌아간다 — 아무것도 안 고른 폼은 저장해도 뜻이 없다
      return next.length === 0 ? [ALL] : next;
    });

  return (
    <ActionForm
      action={formAction}
      state={state}
      pending={submitting}
      className="animate-rise flex flex-col gap-5 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[0_0_0_2px_var(--acc),var(--elev-card)] sm:p-6"
    >
      <input type="hidden" name="gameId" value={game.id} />
      {platforms.map((p) => (
        <input key={p} type="hidden" name="platform" value={p} />
      ))}
      <input type="hidden" name="minDiscountPct" value={minDiscount} />
      <input type="hidden" name="mode" value={mode} />

      {/* 머리: 게임 + 저장 단추. 단추가 위에 있어야 조건을 고르자마자 누른다(2026-10-27 사용자) */}
      <div className="flex flex-wrap items-center gap-3">
        {game.coverUrl ? (
          <FadeImage
            src={game.coverUrl}
            alt=""
            width={88}
            height={50}
            unoptimized
            className="h-[50px] w-[88px] shrink-0 rounded-[var(--radius-inset)] object-cover shadow-hair"
            fallback={<ImageFallback label="" className="h-[50px] w-[88px] shrink-0 rounded-[var(--radius-inset)]" />}
          />
        ) : (
          <ImageFallback label="" className="h-[50px] w-[88px] shrink-0 rounded-[var(--radius-inset)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-acc">{initial ? AM.formEdit : AM.formNew}</p>
          <h2 className="text-[17px] font-extrabold tracking-[-0.035em] text-ink sm:text-[19px]">
            <Clamp>{game.title}</Clamp>
          </h2>
        </div>
        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          <StatusLine state={state} />
          <SubmitButton label={initial ? AM.formSubmitEdit : AM.formSubmit} pendingLabel={AM.formPending} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 flex items-baseline gap-2 text-[13px] font-semibold text-ink-2">
          {AM.formPlatform}
          <span className="text-[12px] font-normal text-dim">{AM.formPlatformMulti}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((o) => {
            const on = platforms.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => togglePlatform(o.value)}
                className={cn(
                  "press tap inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-base",
                  on ? "bg-acc text-on-ink shadow-[0_4px_12px_-4px_var(--acc)]" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
                )}
              >
                {on && <CheckIcon key="on" size={14} aria-hidden className="animate-pick" />}
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-4 p-4 shadow-hair">
        {/* 기준 고르기 — 둘 중 하나라 붙은 두 칸(세그먼트)이다 */}
        <div role="group" aria-label={AM.formMode} className="flex w-fit gap-0.5 rounded-full bg-surface-2 p-0.5">
          {(["discount", "price"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "press tap rounded-full px-4 py-1.5 text-[13.5px] font-bold transition-[background-color,color,box-shadow] duration-base",
                mode === m ? "bg-surface text-ink shadow-1" : "text-dim hover:text-ink",
              )}
            >
              {m === "discount" ? AM.modeDiscount : AM.modePrice}
            </button>
          ))}
        </div>

        {mode === "discount" ? (
          <div key="discount" className="animate-fade-in flex flex-col gap-2">
            <label htmlFor="min-discount" className="text-[13px] text-mut">
              {AM.formDiscountLabel}
            </label>
            <div className="flex items-center gap-4">
              <input
                id="min-discount"
                type="range"
                min={1}
                max={100}
                step={1}
                value={minDiscount}
                onChange={(e) => setMinDiscount(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--acc)]"
                style={{ background: `linear-gradient(to right, var(--acc) ${minDiscount}%, var(--surface-3) ${minDiscount}%)` }}
              />
              <span className="w-[64px] shrink-0 text-right text-[22px] font-extrabold tabular-nums tracking-[-0.035em] text-acc">-{minDiscount}%</span>
            </div>
            <p className="text-[12px] text-dim">
              {AM.formDiscountHint}
              {fromProfile && <span className="text-acc"> | {PERSONAL_MESSAGES.alertFromProfile}</span>}
            </p>
          </div>
        ) : (
          <div key="price" className="animate-fade-in flex flex-col gap-2">
            <label htmlFor="target-price" className="text-[13px] text-mut">
              {AM.formPriceLabel}
            </label>
            {/* 글자 16px — iOS 확대 방지(규약 §6). 쉼표는 치는 대로 넣어 주고 저장할 때 액션이 숫자만 남긴다 */}
            <div className="flex h-11 max-w-[320px] items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 focus-within:border-acc focus-within:shadow-[0_0_0_3px_var(--acc-glow)]">
              <input
                id="target-price"
                name="targetPrice"
                inputMode="numeric"
                autoComplete="off"
                placeholder="30,000"
                value={target}
                // 치는 동안은 친 글 그대로 두고 칸을 떠날 때 쉼표를 찍는다 — 칠 때마다 갈아 끼우면 Ctrl+Z 기록이 날아가고 커서가 튄다(ui/number-field 와 같은 이유)
                onChange={(e) => {
                  const raw = e.target.value;
                  if (/^[0-9,]*$/.test(raw) && raw.replace(/,/g, "").length <= TARGET_DIGITS_MAX) setTarget(raw);
                }}
                onBlur={() => {
                  const digits = target.replace(/[^0-9]/g, "");
                  setTarget(digits ? Number(digits).toLocaleString("ko-KR") : "");
                }}
                className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-dim"
              />
              <span aria-hidden className="text-[16px] font-bold text-dim">
                원
              </span>
            </div>
            <p className="text-[12px] text-dim">{AM.formPriceHint}</p>
          </div>
        )}
      </div>
    </ActionForm>
  );
}
