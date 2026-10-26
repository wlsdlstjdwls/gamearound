"use client";
// "최신 관련 뉴스" 마디(목업: 최신 3건 + 더보기/접기). 목록(NewsList)은 서버가 다 그려 넘기고,
// 여기는 넷째 줄부터 감출지 하나만 든다 — 펼칠 때 서버를 다시 부르지 않아 누른 순간 늘어난다(AGENTS §6).
// 더 받을 것이 없는 게임(3건 이하)에는 버튼을 세우지 않는다.
import { useState } from "react";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { SectionHead } from "@/components/ui/page";
import { cn } from "@/lib/cn";

/** 접힌 채로 보여 줄 건수(기획서 v2.0 S-05 "최신 3건") */
const NEWS_PREVIEW = 3;

export function NewsMore({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const more = count > NEWS_PREVIEW;
  return (
    <section aria-labelledby="news-heading" className="flex min-w-0 flex-col gap-3">
      <SectionHead
        id="news-heading"
        title={D.newsHeading}
        action={
          more && (
            <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="press min-h-[var(--touch-target)] px-1 text-[13px] text-mut hover:text-acc">
              {open ? D.newsLess : D.newsMore}
            </button>
          )
        }
      />
      {/* NewsList 의 ul > li 를 넷째부터 감춘다. 건수는 서버가 세어 넘긴다 — 감춘 줄을 클라이언트가 다시 셀 일이 없다 */}
      <div className={cn("min-w-0", more && !open && "[&>ul>li:nth-child(n+4)]:hidden")}>{children}</div>
    </section>
  );
}
