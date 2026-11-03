"use client";
// 찜 할인 알림 스위치 — 설정 화면과 가격 알림 화면이 같은 손잡이를 세운다(규약 §3). 발송은 sync/dispatch-wish-alerts.
// 모양과 낙관적 토글은 ui/setting-switch 가 맡는다.
import { SettingSwitch } from "@/components/ui/setting-switch";
import { WISH_ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { setWishSaleAlertsAction } from "@/app/(user)/alerts/actions";

export function WishSaleToggle({ initialOn, surface = "inset", className }: { initialOn: boolean; surface?: "inset" | "inline"; className?: string }) {
  return (
    <SettingSwitch
      initialOn={initialOn}
      title={M.title}
      onText={M.on}
      offText={M.off}
      failedText={M.failed}
      action={setWishSaleAlertsAction}
      surface={surface}
      className={className}
    />
  );
}
