"use client";
// 온보딩 알림 단계의 본문 — 종이 울리는 큰 "알림 켤게요" 키 하나와 지금 상태 한 줄.
// 권한, 구독은 설정 토글과 같은 훅(use-push-subscription)이 맡는다. 이 버튼은 form 안에 있지만 type="button" 이라
// 누른다고 다음 단계로 넘어가지 않는다 — 켠 뒤 "다음" 을 누르게 한다(page.tsx 의 NotifyStepPage 주석).
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { RIPPLE_DELAYS_MS } from "@/lib/motion";
import { BellIcon, CheckIcon, SpinnerIcon } from "@/components/ui/icons";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import { PUSH_MESSAGES } from "@/lib/push/messages";
import { usePushSubscription } from "@/components/push/use-push-subscription";

const M = ONBOARDING_MESSAGES.notify;

export function NotifyStepBody() {
  const { status, busy, error, iosHint, subscribe } = usePushSubscription();
  const on = status === "subscribed";
  // 켤 수 없는 상태(지원 안 함, 차단)에서는 버튼을 끈다 — 눌러도 권한 창이 안 뜨고 실패만 쌓인다
  const blocked = status === "checking" || status === "unsupported" || status === "denied";

  // 켤 수 있는데 아직 안 켠 때만 종 뒤로 물결이 퍼진다 — 눌러 볼 자리가 여기라는 손짓이다. 켠 뒤나 막힌 때는 멈춘다
  const inviting = !on && !blocked && !busy;

  return (
    <div className="flex flex-col gap-3">
      {/*
        큰 게임 키 하나(2026-10-08 사용자 요청: 알림 단계도 게임처럼). 예전의 회색 보조 버튼은 "다음" 과 경쟁하지 못해
        안 보였다. 켜지면 고른 키 차림(data-on)으로 바뀌고 종이 체크로 바뀐다.
        켠 뒤에도 disabled 지만 흐리게 하지 않는다 — 꺼진 것이 아니라 "다 됐다" 다. 흐리게 하는 건 막힌 때(blocked)뿐이다.
      */}
      <button
        type="button"
        onClick={subscribe}
        disabled={on || blocked || busy}
        aria-busy={busy || undefined}
        data-on={on ? "" : undefined}
        className={cn("key flex w-full items-center gap-4 rounded-[16px] p-4 text-left", blocked && "opacity-50")}
      >
        <span aria-hidden className="relative flex size-14 shrink-0 items-center justify-center">
          {inviting &&
            RIPPLE_DELAYS_MS.map((delay) => (
              <span key={delay} className="soon-ripple absolute inset-0 rounded-full bg-acc" style={{ "--stagger": `${delay}ms` } as CSSProperties} />
            ))}
          <span className="relative flex size-14 items-center justify-center rounded-full bg-acc text-on-ink">
            {busy ? <SpinnerIcon size={22} /> : on ? <CheckIcon size={24} /> : <BellIcon size={24} />}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("text-[16px] font-extrabold tracking-[-0.02em]", on ? "text-acc" : "text-ink")}>{busy ? M.enabling : on ? M.enabled : M.enable}</span>
          <span className="text-[12.5px] leading-[1.5] text-mut">{M.hint}</span>
        </span>
      </button>
      {/* 상태 줄은 낭독기에도 바뀐 순간 들리게 한다 — 버튼 글자만 바뀌면 켜졌는지 모른다 */}
      <p role="status" className="text-center text-[13px] leading-[1.6] text-mut">
        {PUSH_MESSAGES.status[status]}
      </p>
      {error && <p className="text-center text-[13px] text-danger">{error}</p>}
      {iosHint && <p className="rounded-[9px] bg-warn-soft px-3.5 py-[11px] text-[12.5px] leading-[1.6] text-warn">{PUSH_MESSAGES.iosHint}</p>}
    </div>
  );
}
