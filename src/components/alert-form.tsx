"use client";
// 가격 알림 폼/컨트롤 (클라이언트). Server Action은 src/app/(user)/alerts/actions.ts
// 리디자인: 플랫폼은 select 대신 칩 버튼, 최소 할인율은 숫자 입력 대신 슬라이더.
// 2026-10-07 고도화: 기준을 둘 중 하나로 고른다(할인율 | 목표가, lib/alerts/condition). 이미 만든 알림이 있으면
// 그 값으로 폼을 채워 "조건 바꾸기" 가 된다 — 저장은 같은 게임, 플랫폼 행을 덮는다(services/alerts 의 createAlert).
import { useActionState, useState, useTransition } from "react";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { createAlertAction, deleteAlertAction, toggleAlertAction, type ActionState } from "@/app/(user)/alerts/actions";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { PLATFORM_LABEL } from "@/lib/format";
import { PLATFORM_ORDER } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import { Clamp } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { XIcon } from "@/components/ui/icons";
import type { AlertDefaults } from "@/lib/onboarding/personal";
import { PERSONAL_MESSAGES } from "@/lib/onboarding/messages";
import { ALERT_MESSAGES as AM } from "@/lib/alerts/messages";
import type { AlertMode } from "@/lib/alerts/condition";

export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체 플랫폼" },
  ...PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORM_LABEL[p] })),
];

const DEFAULT_MIN_DISCOUNT = 50;

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

/** 새 알림 생성 폼 — /alerts?game=<slug> 로 진입했을 때 상단에 노출 */
export function AlertForm({ game, defaults, initial }: { game: FormGame; defaults?: AlertDefaults; initial?: AlertInitial }) {
  const [state, formAction, submitting] = useActionState(createAlertAction, null);
  // 첫 값 순서: 이미 만든 알림 > 온보딩 취향(설계 §9 의 4회차) > 폼의 기본값
  const [platform, setPlatform] = useState<string>(initial?.platform ?? defaults?.platform ?? "all");
  const [mode, setMode] = useState<AlertMode>(initial?.mode ?? "discount");
  const [minDiscount, setMinDiscount] = useState(initial?.minDiscountPct ?? defaults?.minDiscountPct ?? DEFAULT_MIN_DISCOUNT);
  const [target, setTarget] = useState(initial?.targetPrice ? initial.targetPrice.toLocaleString("ko-KR") : "");
  const fromProfile = !initial && defaults?.minDiscountPct != null;

  // 새 알림 상자 — 이 화면에서 면을 가진 유일한 자리다. 연한 브랜드 면을 쓰는 이유는
  // "지금 만들려던 것" 과 "이미 만들어 둔 것"(아래 줄 목록)을 색으로 가르기 위해서다
  return (
    <ActionForm action={formAction} state={state} pending={submitting} className="flex flex-col gap-[18px] rounded-[var(--radius-cover-lg)] bg-acc-soft p-6">
      <input type="hidden" name="gameId" value={game.id} />
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="minDiscountPct" value={minDiscount} />
      <input type="hidden" name="mode" value={mode} />

      <div className="flex items-center gap-3">
        {game.coverUrl ? (
          <FadeImage
            src={game.coverUrl}
            alt=""
            width={72}
            height={42}
            unoptimized
            className="h-[42px] w-[72px] rounded-[7px] object-cover"
            fallback={<ImageFallback label="" className="h-[42px] w-[72px] rounded-[7px]" />}
          />
        ) : (
          <ImageFallback label="" className="h-[42px] w-[72px] rounded-[7px]" />
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-bold tracking-[0.08em] text-acc">{initial ? AM.formEdit : AM.formNew}</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.035em] text-ink sm:text-[19px]">
            <Clamp>{game.title}</Clamp>
          </h2>
          {game.priceNote && <p className="mt-0.5 text-[12.5px] text-mut">{game.priceNote}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] text-mut">{AM.formPlatform}</legend>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_OPTIONS.map((o) => (
              <ChipButton key={o.value} active={platform === o.value} onClick={() => setPlatform(o.value)}>
                {o.label}
              </ChipButton>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          {/* 기준 고르기. 칩 둘 — 탭(role=tablist)으로 만들면 화살표 키 이동까지 갖춰야 하는데, 고르는 값이 둘뿐이라 칩이면 충분하다 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[12.5px] text-mut">{AM.formMode}</legend>
            <div className="flex flex-wrap gap-1.5">
              <ChipButton active={mode === "discount"} onClick={() => setMode("discount")}>
                {AM.modeDiscount}
              </ChipButton>
              <ChipButton active={mode === "price"} onClick={() => setMode("price")}>
                {AM.modePrice}
              </ChipButton>
            </div>
          </fieldset>

          {mode === "discount" ? (
            <>
              <label htmlFor="min-discount" className="text-[12.5px] text-mut">
                {AM.formDiscountLabel}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="min-discount"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={minDiscount}
                  onChange={(e) => setMinDiscount(Number(e.target.value))}
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--ink)]"
                  style={{ background: `linear-gradient(to right, var(--ink) ${minDiscount}%, var(--surface) ${minDiscount}%)` }}
                />
                <span className="w-[56px] shrink-0 text-right text-[20px] font-extrabold tracking-[-0.035em] text-acc">-{minDiscount}%</span>
              </div>
              <p className="text-[11.5px] text-dim">{AM.formDiscountHint}</p>
              {fromProfile && <p className="text-[11.5px] text-acc">{PERSONAL_MESSAGES.alertFromProfile}</p>}
            </>
          ) : (
            <>
              <label htmlFor="target-price" className="text-[12.5px] text-mut">
                {AM.formPriceLabel}
              </label>
              {/* 글자 16px — iOS 확대 방지(규약 §6). 쉼표는 치는 대로 넣어 주고 저장할 때 액션이 숫자만 남긴다 */}
              <div className="flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3.5 focus-within:border-acc focus-within:shadow-[0_0_0_3px_var(--acc-glow)]">
                <span aria-hidden className="text-[16px] font-bold text-dim">
                  ₩
                </span>
                <input
                  id="target-price"
                  name="targetPrice"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="30,000"
                  value={target}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
                    setTarget(digits ? Number(digits).toLocaleString("ko-KR") : "");
                  }}
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-bold text-ink outline-none placeholder:font-normal placeholder:text-dim"
                />
              </div>
              <p className="text-[11.5px] text-dim">{AM.formPriceHint}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-strong pt-4">
        <p className="text-[12.5px] text-mut">{AM.formSendRule}</p>
        <div className="flex items-center gap-3">
          <StatusLine state={state} />
          <SubmitButton label={initial ? AM.formSubmitEdit : AM.formSubmit} pendingLabel={AM.formPending} />
        </div>
      </div>
    </ActionForm>
  );
}

/** 목록 행의 활성 토글, 삭제 버튼 */
export function AlertItemControls({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  // 성공 시엔 revalidate로 화면이 갱신되므로 에러만 표시
  const [state, setState] = useState<ActionState>(null);

  return (
    <div className="flex items-center gap-2.5">
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
      <Switch on={isActive} label={AM.toggle} disabled={pending} onToggle={() => start(async () => setState(await toggleAlertAction(id)))} />
      <button
        type="button"
        disabled={pending}
        aria-label={AM.remove}
        onClick={() => {
          if (!confirm(AM.removeConfirm)) return;
          start(async () => setState(await deleteAlertAction(id)));
        }}
        // 그림은 작아도 누르는 넓이는 44px(규약 §6). 지우기는 되돌릴 수 없어 hover 에서 빨강으로 미리 말한다
        className="press tap flex size-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
