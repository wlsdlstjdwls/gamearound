"use client";
// 웹푸시 구독 토글 (§7). 권한, 구독 순서는 use-push-subscription 이 맡고 여기는 스위치 모양만 그린다
import { SectionHead } from "@/components/ui/page";
import { PUSH_MESSAGES as M } from "@/lib/push/messages";
import { usePushSubscription } from "@/components/push/use-push-subscription";

export function PushToggle({ initialCount }: { initialCount: number }) {
  const { status, busy, error, iosHint, subscribe, unsubscribe } = usePushSubscription();

  const on = status === "subscribed";
  const disabled = busy || status === "checking" || status === "unsupported" || status === "denied";

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHead title="웹푸시 알림" size="sub" />
      <div className="flex flex-wrap items-center justify-between gap-3.5 border-t border-line-strong py-4">
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold text-ink">이 브라우저에서 할인 알림 받기</p>
          <p className="mt-0.5 text-[12.5px] text-mut">
            {M.status[status]}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="웹푸시 알림"
          disabled={disabled && !on}
          onClick={on ? unsubscribe : subscribe}
          // 보이는 스위치는 24px 이지만 손가락이 닿는 넓이는 44px 이다 — 판을 키우면 알약이 세로로 늘어난다.
          // 위아래로만 벌린다: 오른쪽 끝에 홀로 서 있어 겹칠 이웃이 없다(검색칸 지우기 버튼과 같은 수법)
          className={`press relative flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-base after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-[''] disabled:opacity-60 ${
            on ? "bg-ink" : "bg-line-strong"
          }`}
        >
          <span
            aria-hidden
            className={`h-5 w-5 rounded-full transition-transform duration-base ease-out-emph ${on ? "translate-x-5 bg-on-ink" : "bg-surface"}`}
          />
        </button>
      </div>

      {/* 인셋 안내문 — 리디자인이 판을 남겨 둔 두 자리 중 하나다(ui/page 의 Panel 주석) */}
      <div className="rounded-xl bg-surface-2 px-4 py-3.5">
        <p className="text-[12.5px] font-semibold text-ink">연결된 기기 {initialCount}대</p>
        <p className="mt-1 text-[12.5px] text-mut">다른 브라우저, 기기에서도 각각 켜야 합니다.</p>
      </div>

      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      {iosHint && (
        <p className="rounded-[9px] bg-warn-soft px-3.5 py-[11px] text-[12px] leading-[1.6] text-warn">
          {M.iosHint}
        </p>
      )}
    </section>
  );
}
