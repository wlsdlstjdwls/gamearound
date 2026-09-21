"use client";
// 가격 알림 폼/컨트롤 (클라이언트). Server Action은 src/app/(user)/alerts/actions.ts
// 리디자인: 플랫폼은 select 대신 칩 버튼, 최소 할인율은 숫자 입력 대신 슬라이더.
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { createAlertAction, deleteAlertAction, toggleAlertAction, type ActionState } from "@/app/(user)/alerts/actions";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { PLATFORM_LABEL } from "@/lib/format";
import { PLATFORM_ORDER } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import { Clamp } from "@/components/ui/tooltip";

export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체 플랫폼" },
  ...PLATFORM_ORDER.map((p) => ({ value: p, label: PLATFORM_LABEL[p] })),
];

const DEFAULT_MIN_DISCOUNT = 50;
const SEND_RULE_TEXT = "조건 충족 시 웹푸시로 1회 발송합니다.";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
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
export function AlertForm({ game }: { game: FormGame }) {
  const [state, formAction] = useActionState(createAlertAction, null);
  const [platform, setPlatform] = useState("all");
  const [minDiscount, setMinDiscount] = useState(DEFAULT_MIN_DISCOUNT);

  // 새 알림 상자 — 이 화면에서 면을 가진 유일한 자리다. 연한 브랜드 면을 쓰는 이유는
  // "지금 만들려던 것" 과 "이미 만들어 둔 것"(아래 줄 목록)을 색으로 가르기 위해서다
  return (
    <form action={formAction} className="flex flex-col gap-[18px] rounded-[var(--radius-cover-lg)] bg-acc-soft p-6">
      <input type="hidden" name="gameId" value={game.id} />
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="minDiscountPct" value={minDiscount} />

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
          <p className="text-[12px] font-bold tracking-[0.08em] text-acc">새 알림</p>
          <h2 className="mt-1 text-[17px] font-extrabold tracking-[-0.035em] text-ink sm:text-[19px]">
            <Clamp>{game.title}</Clamp>
          </h2>
          {game.priceNote && <p className="mt-0.5 text-[12.5px] text-mut">{game.priceNote}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] text-mut">알림 받을 플랫폼</legend>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_OPTIONS.map((o) => (
              <ChipButton key={o.value} active={platform === o.value} onClick={() => setPlatform(o.value)}>
                {o.label}
              </ChipButton>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="min-discount" className="text-[12.5px] text-mut">
            이 정도 할인이면 알려주세요
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
          <p className="text-[11.5px] text-dim">1%로 두면 할인이 시작될 때마다 알립니다.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-strong pt-4">
        <p className="text-[12.5px] text-mut">{SEND_RULE_TEXT}</p>
        <div className="flex items-center gap-3">
          <StatusLine state={state} />
          <SubmitButton label="알림 만들기" pendingLabel="저장 중…" />
        </div>
      </div>
    </form>
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
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label="알림 켜기/끄기"
        disabled={pending}
        onClick={() => start(async () => setState(await toggleAlertAction(id)))}
        className={`press flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-0.5 transition-colors duration-base disabled:opacity-60 ${
          isActive ? "bg-ink" : "bg-line-strong"
        }`}
      >
        <span
          aria-hidden
          className={`h-[18px] w-[18px] rounded-full bg-surface transition-transform duration-base ease-out-emph ${isActive ? "translate-x-4" : ""}`}
        />
      </button>
      <button
        type="button"
        disabled={pending}
        aria-label="알림 삭제"
        onClick={() => {
          if (!confirm("이 알림을 삭제할까요?")) return;
          start(async () => setState(await deleteAlertAction(id)));
        }}
        className="press flex h-6 w-6 items-center justify-center rounded-md text-[12px] text-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
      >
        ✕
      </button>
    </div>
  );
}
