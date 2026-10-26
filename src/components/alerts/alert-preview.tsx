// 가격 알림 한 줄의 "알림 미리보기"(기획서 v2.0 S-26 "항목마다 알림 미리보기", 목업 alv 의 미리보기 단추).
//
// 무엇을 보여 주나: 조건이 맞는 순간 실제로 오는 것 — 웹 알림(푸시) 한 통과 알림함 한 줄, 받는 방법이 이메일이면 메일 한 통.
// 글은 발송과 같은 함수로 짓는다(lib/alerts/payload) — 미리보기와 실제 알림이 다르면 미리보기가 거짓말이 된다.
// 목업처럼 실제로 쏘지 않는다: 시험 발송은 알림함과 푸시 기록에 가짜 줄을 남기고, 7일 중복 방지까지 건드린다.
//
// 서버 컴포넌트다 — 여닫는 일은 Sheet(클라이언트)가 하고, 안의 내용은 서버에서 그린 그대로 받는다.
import { Sheet } from "@/components/ui/sheet";
import { BellIcon } from "@/components/ui/icons";
import { ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { alertPayload, alertPreviewInput } from "@/lib/alerts/payload";
import { formatPrice } from "@/lib/currency";
import { NOTIFICATION_MESSAGES } from "@/lib/notifications/messages";
import { SITE } from "@/lib/site";
import type { AlertView } from "@/server/services/alerts";

export function AlertPreview({ v }: { v: AlertView }) {
  const input = alertPreviewInput(v.game.title, { minDiscountPct: v.minDiscountPct, targetPrice: v.targetPrice }, v.status.best, v.status.met);
  // 값을 모르는 게임은 무엇이 올지 지어낼 수 없다 — 단추째 세우지 않는다
  if (!input) return null;
  const { title, body } = alertPayload(input);

  return (
    <Sheet label={M.preview} title={M.previewTitle} triggerClassName="mr-1">
      <div className="flex flex-col gap-5 sm:w-[400px]">
        <p className="text-[12.5px] leading-[1.6] text-dim">{v.status.met ? M.previewNow : M.previewSample}</p>

        <section aria-label={M.previewWeb} className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-ink">{M.previewWeb}</h3>
          <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-3.5 shadow-hair">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-acc-soft text-acc">
              <BellIcon size={18} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12px] text-dim">{SITE.name}</span>
              <b className="text-[14px] font-bold text-ink">{title}</b>
              <span className="text-[13px] text-mut">{body}</span>
            </div>
          </div>
          <p className="text-[12.5px] text-dim">
            {M.previewInbox} {NOTIFICATION_MESSAGES.priceDrop(v.game.title, formatPrice(input.price, input.currency))}
          </p>
        </section>

        {v.channel === "email" && (
          <section aria-label={M.previewEmail} className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-ink">{M.previewEmail}</h3>
            <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3.5 text-[13px] shadow-hair">
              <span className="text-dim">{M.previewEmailTo}</span>
              <b className="font-bold text-ink">
                [{SITE.name}] {title}
              </b>
              <span className="text-mut">{body}</span>
              <span className="font-semibold text-acc">{M.previewEmailLink}</span>
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}
