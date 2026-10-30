// 좁은 화면 가입의 단계 부품 — 단계 순서, 머리(진행 막대 + 질문), 칸 자리(지금 칸 | 접힌 칩 | 아직), 접힌 칩.
//
// 한 화면에 한 질문(2026-10-30 사용자, fitin-app 가입 흐름을 본떴다). 넓은 화면(lg)은 칸을 한꺼번에 보여 주는 옛 폼 그대로다.
// 둘을 두 벌로 그리지 않는다 — <input> 은 언제나 한 벌로 붙어 있고, 단계는 **CSS 로 가리기만** 한다(hidden lg:block).
// 그래야 FormData, 서버 액션, useAuthForm 계약이 하나로 남고, 서버가 그린 첫 화면과 하이드레이션 뒤 화면이 같다
// (matchMedia 로 갈랐다면 좁은 화면이 첫 프레임에 넓은 폼을 그렸다가 바뀐다).
// 가려진 칸도 FormData 에 들어간다 — display:none 은 값을 빼지 않는다. 빼는 것은 disabled 뿐이다.
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";

/** 단계 순서. 끝 단계(약관)는 칸이 아니라 동의 묶음이라 이름이 없다. 질문 문구는 messages 의 같은 순번 */
export const SIGNUP_STEPS = ["displayName", "email", "password", "passwordConfirm", "consent"] as const;
export type SignUpStepName = (typeof SIGNUP_STEPS)[number];
export const CONSENT_STEP = SIGNUP_STEPS.length - 1;

/** 단계 칸이 그 너비 밖(넓은 화면)인지 — Tailwind lg(64rem)와 같은 값이어야 CSS 로 가린 것과 키 처리가 어긋나지 않는다 */
const WIDE_QUERY = "(min-width: 64rem)";
export function isWideForm(): boolean {
  return window.matchMedia(WIDE_QUERY).matches;
}

export type SlotState = "active" | "done" | "todo";

/** 진행 막대와 질문. 넓은 화면에서는 서지 않는다 */
export function StepHead({ step }: { step: number }) {
  const note = M.signUpStepNotes[step];
  return (
    <div className="flex flex-col gap-2 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-acc transition-[width] duration-slow ease-out-emph" style={{ width: `${((step + 1) / SIGNUP_STEPS.length) * 100}%` }} />
        </div>
        <span className="text-[12px] font-semibold tabular-nums text-dim">{M.signUpStepOf(step + 1, SIGNUP_STEPS.length)}</span>
      </div>
      {/* key 로 단계마다 새로 서게 해 질문이 바뀔 때 떠오른다(animate-rise). 칸은 key 를 달지 않는다 — 다시 만들어지면 친 값이 날아간다 */}
      <div key={step} className="animate-rise pt-1">
        <h2 className="text-[21px] font-extrabold leading-snug tracking-[-0.03em] text-ink">{M.signUpStepQuestions[step]}</h2>
        {note && <p className="mt-1 text-[13px] leading-relaxed text-mut">{note}</p>}
      </div>
    </div>
  );
}

/**
 * 칸 하나의 자리. 지금 칸이면 입력 칸과 "다음" 단추, 지나온 칸이면 칩, 아직이면 아무것도 서지 않는다(좁은 화면만).
 * 넓은 화면은 상태와 상관없이 입력 칸만 선다.
 */
export function StepSlot({ state, chip, next, className, style, children }: { state: SlotState; chip: ReactNode; next: ReactNode; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn(state === "todo" && "hidden lg:block", className)} style={style}>
      {state === "done" && <div className="lg:hidden">{chip}</div>}
      <div className={cn(state === "done" && "hidden lg:block", state === "active" && "max-lg:animate-rise")}>
        {children}
        {state === "active" && <div className="mt-3 lg:hidden">{next}</div>}
      </div>
    </div>
  );
}

/** 지나온 칸의 접힌 모습 — 이름표와 친 값. 누르면 그 칸으로 돌아가 고친다 */
export function StepChip({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      // 흰 면 + 헤어라인 — 판(Panel)이 이미 --surface-2 라 같은 색이면 칩 경계가 사라진다(2026-10-30 390폭 실측)
      className="press flex min-h-[var(--touch-target)] w-full items-center gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-left shadow-hair"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11.5px] font-medium text-dim">{label}</span>
        <span className="truncate text-[15px] font-semibold text-ink">{value}</span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-acc-hover">
        {M.signUpEdit}
        <span className="sr-only"> {label}</span>
      </span>
    </button>
  );
}

/** 칩에 보일 비밀번호 — 글자 수만큼 점. 실제 글자는 칩에 올리지 않는다 */
export function maskSecret(value: string): string {
  return "•".repeat(Math.min(value.length, 16));
}
