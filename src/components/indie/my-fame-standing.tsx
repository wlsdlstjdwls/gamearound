"use client";
// 명예의 전당 "내 게임은 지금" 카드(2026-10-28, 사용자: "3위 안에 못 들어도 힘나도록 유도, 서비스 기획 관점으로").
// 순위표는 남의 게임만 보여 줘서, 10위 밖 개발자에게는 "나와 상관없는 화면" 이었다. 내 게임이 몇 위인지,
// 한 계단 오르려면 몇 점이 모자란지, 점수가 무엇으로 쌓이는지를 한 판에 적고 개발일지 쓰기로 잇는다.
// 화면 본문이 ISR 이라 마운트 뒤 api/me/fame 에서 받는다(비로그인, 공개 게임 없음이면 아무것도 안 그린다).
// 이번 달을 볼 때만 세운다 — 지난달은 확정된 순위라 "더 올라 보세요" 가 뜻이 없다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { TrophyIcon } from "@/components/ui/icons";
import { FAME_MESSAGES as M, type MyFameStanding } from "@/lib/indie/fame";
import { writePath } from "@/lib/community/constants";
import { indiePath, ROUTES } from "@/lib/routes";

export function MyFameStandingCard() {
  const [s, setS] = useState<MyFameStanding | null>(null);
  useEffect(() => {
    let live = true;
    fetch(ROUTES.apiMeFame, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { standing: MyFameStanding | null } | null) => live && setS(j?.standing ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (!s) return null;

  const head = s.rank === 1 ? M.myRankFirst(s.title) : s.rank ? M.myRanked(s.title, s.rank) : M.myUnranked(s.title);
  const sub =
    s.rank && s.gapUp ? M.myGapUp(s.rank - 1, s.gapUp) : s.rank ? null : s.needLikes > 0 ? M.myNeedLikes(s.monthLikes, s.needLikes) : s.gapUp ? M.myGapTop(s.gapUp) : M.myOpen;
  return (
    <section aria-label={M.myHead} className="animate-rise relative isolate flex flex-col gap-3 overflow-hidden rounded-[var(--radius-panel)] bg-acc-soft p-4 shadow-[inset_0_0_0_1px_var(--acc-3)] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <span aria-hidden className="hero-beam beam-soft" />
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-acc shadow-hair">
        {s.rank ? <span className="text-[18px] font-black tabular-nums">{s.rank}</span> : <TrophyIcon size={22} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[12px] font-bold text-acc">{M.myHead}</span>
        <Link href={indiePath(s.slug)} className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-ink hover:text-acc">
          {head}
        </Link>
        {sub && <span className="text-[13.5px] font-semibold text-ink-2">{sub}</span>}
        <span className="text-[12px] text-dim">{M.myHow}</span>
      </div>
      <Link href={writePath("devlog")} className={buttonClass({ size: "sm", className: "shrink-0 self-start sm:self-center" })}>
        {M.myWriteLog}
      </Link>
    </section>
  );
}
