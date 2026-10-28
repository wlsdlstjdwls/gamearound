"use client";
// 등록현황(app/(user)/indie/mine) 반려 줄의 "사유 보기" — 반려 사유 전문을 바닥 시트로 연다(2026-10-27, 사용자: "반려 사유 표현이 부족하다,
// 팝업이나 바텀시트로 상세 볼 수 있게"). 줄에서는 한 줄로 잘려 무엇을 고쳐야 하는지 끝까지 읽을 수 없었다.
// 시트 바닥에 "고쳐서 다시 신청" 을 둔다 — 사유를 다 읽은 그 자리에서 바로 고치러 간다.
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { buttonClass } from "@/components/ui/button";
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
        <p className="text-[13px] text-mut">{RV.rejectedNotice}</p>
        <Link href={editHref} className={buttonClass({ variant: "accent", size: "lg", fullWidth: true })}>
          {RV.resubmit}
        </Link>
      </div>
    </Sheet>
  );
}
