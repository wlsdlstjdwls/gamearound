"use client";
// 가격 알림 폼/컨트롤 (클라이언트). Server Action은 src/app/(user)/alerts/actions.ts
// 리디자인: 플랫폼은 select 대신 칩 버튼, 최소 할인율은 숫자 입력 대신 슬라이더.
import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { createAlertAction, deleteAlertAction, toggleAlertAction, type ActionState } from "@/app/(user)/alerts/actions";
import { PLATFORM_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";

export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체 플랫폼" },
  ...(["steam", "ps5", "ps4", "xbox", "switch", "switch2"] as const).map((p) => ({ value: p, label: PLATFORM_LABEL[p] })),
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
    <p aria-live="polite" className={`text-[12.5px] ${state.ok ? "text-acc" : "text-danger"}`}>
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

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-ink bg-surface p-5">
      <input type="hidden" name="gameId" value={game.id} />
      <input type="hidden" name="platform" value={platform} />
      <input type="hidden" name="minDiscountPct" value={minDiscount} />

      <div className="flex items-center gap-3">
        {game.coverUrl ? (
          <Image src={game.coverUrl} alt="" width={72} height={42} unoptimized className="h-[42px] w-[72px] rounded-[7px] object-cover" />
        ) : (
          <div aria-hidden className="h-[42px] w-[72px] rounded-[7px] bg-surface-3" />
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[14.5px] font-bold tracking-[-0.01em] text-ink">{game.title}</h2>
          {game.priceNote && <p className="text-[12px] text-dim">{game.priceNote}</p>}
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
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-2 accent-[var(--ink)]"
              style={{ background: `linear-gradient(to right, var(--ink) ${minDiscount}%, var(--surface-2) ${minDiscount}%)` }}
            />
            <span className="w-[52px] shrink-0 text-right text-[15px] font-bold text-ink">-{minDiscount}%</span>
          </div>
          <p className="text-[11.5px] text-dim">1%로 두면 할인이 시작될 때마다 알립니다.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
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
