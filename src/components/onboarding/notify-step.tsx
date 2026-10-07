"use client";
// 온보딩 알림 단계의 본문 — "알림 켤게요" 버튼 하나와 지금 상태 한 줄.
// 권한, 구독은 설정 토글과 같은 훅(use-push-subscription)이 맡는다. 이 버튼은 form 안에 있지만 type="button" 이라
// 누른다고 다음 단계로 넘어가지 않는다 — 켠 뒤 "다음" 을 누르게 한다(page.tsx 의 NotifyStepPage 주석).
import { Button } from "@/components/ui/button";
import { BellIcon } from "@/components/ui/icons";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import { PUSH_MESSAGES } from "@/lib/push/messages";
import { usePushSubscription } from "@/components/push/use-push-subscription";

const M = ONBOARDING_MESSAGES.notify;

export function NotifyStepBody() {
  const { status, busy, error, iosHint, subscribe } = usePushSubscription();
  const on = status === "subscribed";
  // 켤 수 없는 상태(지원 안 함, 차단)에서는 버튼을 끈다 — 눌러도 권한 창이 안 뜨고 실패만 쌓인다
  const blocked = status === "checking" || status === "unsupported" || status === "denied";

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant={on ? "soft" : "secondary"}
        size="lg"
        fullWidth
        loading={busy}
        loadingLabel={M.enabling}
        disabled={on || blocked}
        onClick={subscribe}
      >
        <BellIcon size={18} className="mr-2" />
        {on ? M.enabled : M.enable}
      </Button>
      {/* 상태 줄은 낭독기에도 바뀐 순간 들리게 한다 — 버튼 글자만 바뀌면 켜졌는지 모른다 */}
      <p role="status" className="text-center text-[13px] leading-[1.6] text-mut">
        {PUSH_MESSAGES.status[status]}
      </p>
      {error && <p className="text-center text-[13px] text-danger">{error}</p>}
      {iosHint && <p className="rounded-[9px] bg-warn-soft px-3.5 py-[11px] text-[12.5px] leading-[1.6] text-warn">{PUSH_MESSAGES.iosHint}</p>}
    </div>
  );
}
