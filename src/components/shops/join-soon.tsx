"use client";
// 입점 랜딩의 "입점 신청하기" 자리 — 지금은 신청서로 보내지 않고 준비 중이라고 말한다(2026-09-21 사용자 결정).
//
// 링크를 지우지 않고 버튼으로 바꾼 이유: 신청 화면(/shops/join)과 심사 흐름은 그대로 살아 있다.
// 지우면 되살릴 때 화면을 다시 만들어야 하고, 주소로는 여전히 열리므로 코드도 그대로 둔다.
// 이 파일 하나와 business/page.tsx 의 한 줄만 되돌리면 신청이 다시 열린다.
//
// 왜 그냥 "준비 중" 글씨가 아니라 시트인가: 랜딩은 매장을 데려오는 화면이라 "무엇이 되는가" 를
// 다 읽고 누른 사람이 온다. 그 자리에서 아무 일도 안 일어나면 고장으로 읽힌다 —
// 무엇이 준비 중이고 언제 다시 오면 되는지를 같은 자리에서 말해 준다.
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { BUSINESS_MESSAGES as B } from "@/lib/shops/messages";

export function JoinSoonButton() {
  return (
    <Sheet
      title={B.soonTitle}
      unstyledTrigger
      triggerClassName={buttonClass({ variant: "primary" })}
      label={B.ctaJoin}
    >
      <div className="flex flex-col items-center gap-4 px-2 py-6 text-center">
        {/* 브랜드 면 위의 큰 글자 하나. 그림 대신 상태를 말로 세운다 — 여기서 할 말은 "아직" 하나뿐이다 */}
        <span className="inline-flex items-center rounded-full bg-acc-soft px-4 py-1.5 text-[12.5px] font-bold text-acc">
          {B.soonBadge}
        </span>
        <p className="text-[17px] font-bold leading-[1.45] tracking-[-0.02em] text-ink">{B.soonLead}</p>
        <p className="max-w-[420px] text-[13.5px] leading-[1.75] text-mut">{B.soonBody}</p>
      </div>
    </Sheet>
  );
}
