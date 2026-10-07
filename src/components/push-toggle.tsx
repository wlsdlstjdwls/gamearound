"use client";
// 웹푸시 구독 토글 (§7). 권한, 구독 순서는 use-push-subscription 이 맡고 여기는 스위치 모양만 그린다
import { SectionHead } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
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
        <Switch on={on} label="웹푸시 알림" disabled={disabled && !on} onToggle={on ? unsubscribe : subscribe} />
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
