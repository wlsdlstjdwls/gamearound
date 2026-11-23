"use client";
// "최신 뉴스" 마디(목업: 최신 3건 + 더보기). 목록(NewsList)은 서버가 다 그려 넘긴다.
// 마디에는 앞 세 건만 보이고, "더보기"(밑줄 글자 단추)는 전체 목록을 팝업으로 연다(2026-11-23 사용자 "아래로 펼쳐지는 게 아닌 팝업 형태로").
// 아래로 펴던 때는 마디가 화면 몇 장 길이로 늘어 아래 마디를 밀어냈다. 팝업 안 목록도 같은 서버 그림이라 열 때 기다림이 없다.
// 더 받을 것이 없는 게임(3건 이하)에는 단추를 세우지 않는다.
import { useState } from "react";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { SectionHead } from "@/components/ui/page";
import { Sheet } from "@/components/ui/sheet";
import { TEXT_LINK } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** 마디에 보여 줄 건수(기획서 v2.0 S-05 "최신 3건") */
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
            <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={TEXT_LINK}>
              {D.newsMore}
            </button>
          )
        }
      />
      {/* NewsList 의 ul > li 를 넷째부터 감춘다. 건수는 서버가 세어 넘긴다 — 감춘 줄을 클라이언트가 다시 셀 일이 없다 */}
      <div className={cn("min-w-0", more && "[&>ul>li:nth-child(n+4)]:hidden")}>{children}</div>
      {more && (
        <Sheet title={D.newsHeading} size="wide" open={open} onOpenChange={setOpen}>
          <div className="min-w-0 overflow-x-hidden pt-2">{children}</div>
        </Sheet>
      )}
    </section>
  );
}
