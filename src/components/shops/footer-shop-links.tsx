"use client";
// 푸터의 매장 두 줄 — 매장 찾기, 매장 입점. 지금은 화면으로 보내지 않고 준비 중이라고 말한다
// (2026-09-22 사용자 결정. 입점 랜딩의 "입점 신청하기" 와 같은 이유다).
//
// 링크를 지우지 않고 버튼으로 바꾼 이유: 두 화면(/shops, /business)은 그대로 살아 있고 주소로는 열린다.
// 지우면 되살릴 때 푸터를 다시 짜야 한다 — 이 파일 하나와 site-footer 의 한 줄만 되돌리면 링크로 돌아간다.
//
// 판은 두 줄이 **하나를 나눠 쓴다** — 줄마다 두면 안 열린 판이 둘 떠 있게 된다(admin-nav 와 같은 규칙).
import { useState } from "react";
import { ComingSoon } from "@/components/ui/coming-soon";
import { BUSINESS_MESSAGES, SHOP_DIRECTORY_MESSAGES } from "@/lib/shops/messages";

/**
 * 푸터 줄의 생김새. 링크와 버튼이 같은 줄에 서므로 글자 크기, 색, 높이가 같아야 한다 —
 * site-footer 가 이 값을 가져다 나머지 링크에도 쓴다(한 곳에서만 고친다).
 */
export const FOOTER_LINK_CLASS =
  "tap inline-flex items-center text-[12px] text-dim transition-colors hover:text-ink focus-visible:text-ink";

/** 준비 중인 두 자리. 누른 자리의 이름이 곧 시트 제목이다 */
const SOON_ITEMS = [
  {
    label: SHOP_DIRECTORY_MESSAGES.title,
    title: SHOP_DIRECTORY_MESSAGES.soonTitle,
    lead: SHOP_DIRECTORY_MESSAGES.soonLead,
    body: SHOP_DIRECTORY_MESSAGES.soonBody,
  },
  {
    label: BUSINESS_MESSAGES.navLabel,
    title: BUSINESS_MESSAGES.soonTitle,
    lead: BUSINESS_MESSAGES.soonLead,
    body: BUSINESS_MESSAGES.soonBody,
  },
] as const;

export function FooterShopLinks() {
  const [soon, setSoon] = useState<(typeof SOON_ITEMS)[number] | null>(null);
  return (
    <>
      {SOON_ITEMS.map((item) => (
        <button key={item.label} type="button" onClick={() => setSoon(item)} aria-haspopup="dialog" className={FOOTER_LINK_CLASS}>
          {item.label}
        </button>
      ))}
      <ComingSoon
        title={soon?.title ?? ""}
        lead={soon?.lead ?? ""}
        body={soon?.body ?? ""}
        open={soon !== null}
        onOpenChange={(v) => !v && setSoon(null)}
      />
    </>
  );
}
