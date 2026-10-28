"use client";
// 푸시 구독 토글 (§7). 권한, 구독 순서는 use-push-subscription 이 맡고 여기는 스위치 모양만 그린다.
// 문구는 "기기" 로 말한다 — 앱에서도 같은 판을 쓸 것이다(lib/push/messages 머리 주석)
import { SectionHead } from "@/components/ui/page";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { PUSH_MESSAGES as M } from "@/lib/push/messages";
import { usePushSubscription } from "@/components/push/use-push-subscription";

export function PushToggle({ initialCount }: { initialCount: number }) {
  const { status, busy, error, iosHint, subscribe, unsubscribe } = usePushSubscription();

  const on = status === "subscribed";
  // 누른 쪽으로 먼저 넘긴다(AGENTS §6). 구독, 해지는 권한 창과 서비스워커, 서버 왕복을 거쳐 몇 초가 걸리는데,
  // 예전엔 끌 때 아무 표시가 없었다(disabled 조건이 켜진 상태를 빼 놨다). 끝나면(busy 가 풀리면) 실제 상태가 말한다 —
  // 권한을 거절하면 꺼진 채로 돌아온다
  const [target, setTarget] = useState<boolean | null>(null);
  const shown = busy && target !== null ? target : on;
  const unavailable = status === "checking" || status === "unsupported" || status === "denied";

  return (
    <section className="flex flex-col gap-3.5">
      <SectionHead title="푸시 알림" size="sub" />
      <div className="flex flex-wrap items-center justify-between gap-3.5 border-t border-line-strong py-4">
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold text-ink">{M.toggleTitle}</p>
          <p className="mt-0.5 text-[12.5px] text-mut">
            {M.status[status]}
          </p>
        </div>
        <Switch
          on={shown}
          label="푸시 알림"
          disabled={unavailable && !on}
          onToggle={() => {
            if (busy) return; // 진행 중에 다시 누르면 구독과 해지가 겹친다
            setTarget(!on);
            (on ? unsubscribe : subscribe)();
          }}
        />
      </div>

      {/* 인셋 안내문 — 리디자인이 판을 남겨 둔 두 자리 중 하나다(ui/page 의 Panel 주석) */}
      <div className="rounded-xl bg-surface-2 px-4 py-3.5">
        <p className="text-[12.5px] font-semibold text-ink">{M.devices(initialCount)}</p>
        <p className="mt-1 text-[12.5px] text-mut">{M.devicesHint}</p>
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
