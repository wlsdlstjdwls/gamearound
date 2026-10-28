"use client";
// 등록현황(app/(user)/indie/mine) 반려 줄의 "사유 보기" — 반려 사유 전문을 바닥 시트로 연다(2026-10-27, 사용자: "반려 사유 표현이 부족하다,
// 팝업이나 바텀시트로 상세 볼 수 있게"). 줄에서는 한 줄로 잘려 무엇을 고쳐야 하는지 끝까지 읽을 수 없었다.
// 사유 아래에 다시 신청하기 전 확인할 것 넷을 둔다(2026-10-28 사용자 "팁도 같이") — 사유가 짧거나 비어 있어도 고칠 방향이 남는다.
// 시트 바닥에 "고쳐서 다시 신청" 을 둔다 — 사유를 다 읽은 그 자리에서 바로 고치러 간다.
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";

export function RejectionSheet({ title, reason, editHref }: { title: string; reason: string | null; editHref: string }) {
  return (
    <Sheet
      title={`${title} ${RV.reason}`}
      label={RV.viewReason}
      unstyledTrigger
      // 글자 링크가 아니라 단추다(2026-10-28 사용자). 반려를 말하는 자리라 빨간 테두리 단추(danger), 옆 "고쳐서 다시 신청" 과 같은 크기
      triggerClassName={buttonClass({ variant: "danger", size: "sm" })}
    >
      <div className="flex flex-col gap-5">
        <p className="whitespace-pre-wrap rounded-[var(--radius-md)] bg-danger-soft px-4 py-3.5 text-[14.5px] leading-[1.7] text-ink">{reason ?? RV.reasonMissing}</p>
        <section aria-labelledby="rejection-tips" className="flex flex-col gap-2.5">
          <h3 id="rejection-tips" className="text-[14px] font-bold text-ink">
            {RV.tipsTitle}
          </h3>
          <ul className="flex flex-col gap-2">
            {RV.tips.map((t) => (
              <li key={t.head} className="flex gap-2.5 rounded-[var(--radius-md)] bg-surface-4 px-3.5 py-3 shadow-hair">
                <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-acc-soft text-acc">
                  <CheckIcon size={12} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13.5px] font-bold text-ink">{t.head}</span>
                  <span className="text-[13px] leading-[1.6] text-mut">{t.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <Link href={editHref} className={buttonClass({ variant: "accent", size: "lg", fullWidth: true })}>
          {RV.resubmit}
        </Link>
      </div>
    </Sheet>
  );
}
