"use client";
// 입점 랜딩의 "입점 신청하기" 자리 — 지금은 신청서로 보내지 않고 준비 중이라고 말한다(2026-09-21 사용자 결정).
//
// 링크를 지우지 않고 버튼으로 바꾼 이유: 신청 화면(/shops/join)과 심사 흐름은 그대로 살아 있다.
// 지우면 되살릴 때 화면을 다시 만들어야 하고, 주소로는 여전히 열리므로 코드도 그대로 둔다.
// 이 파일 하나와 business/page.tsx 의 한 줄만 되돌리면 신청이 다시 열린다.
//
// 판 자체는 공용 ComingSoon 이 맡는다 — 관리자 메뉴의 "상품 매핑", "입점 신청" 도 같은 판을 쓴다.
// 같은 말을 두 모양으로 하면 둘 중 하나는 반드시 낡는다.
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { ComingSoon } from "@/components/ui/coming-soon";
import { BUSINESS_MESSAGES as B } from "@/lib/shops/messages";

export function JoinSoonButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "primary" })}>
        {B.ctaJoin}
      </button>
      <ComingSoon title={B.soonTitle} lead={B.soonLead} body={B.soonBody} open={open} onOpenChange={setOpen} />
    </>
  );
}
