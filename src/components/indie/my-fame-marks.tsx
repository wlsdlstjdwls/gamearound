"use client";
// 명예의 전당 순위표 안의 "내 게임" 표시(2026-10-30, 사용자 "내 게임은 지금 뜨는 것도 별로, 서비스 기획 관점에서").
// 바닥에 떠 있던 카드는 플레이어의 진열장을 개발자 한 사람의 안내판이 가렸다. 게임 순위표처럼 내 자리는 표 **안에서** 짚는다:
//  - TOP 10 안이면 그 카드, 줄 자체를 바꾼다: data-fame-mine 을 붙이면 globals.css 가 보라로 물들이고 숨겨 둔 "내 게임" 글줄을 편다.
//    딱지, 띠, 태그를 얹는 방식은 모두 걷었다(2026-10-30 사용자 "뱃지 말고 다른 형태") — 얹은 것은 테두리가 별로이거나, 싸 보이거나,
//    안 보이거나, 순위 딱지, 글과 겹쳤다. 게임 순위표에서 내 줄만 색이 다른 것처럼 카드가 곧 표시다. 얹는 마디가 없어 겹칠 일도 없다.
//  - 밖이면 순위표 맨 아래에 얇은 줄 하나를 붙인다. 이미 본 것 아래라 밀어내지 않는다. 누르면 내 게임 관리의 도전 판으로 간다.
// 화면 본문이 ISR 이라 개인 값은 마운트 뒤 api/me/fame 에서 받는다. 이번 달을 볼 때만 세운다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { SproutIcon } from "@/components/ui/icons";
import { FAME_MESSAGES as M, FAME_CARD_ATTR, FAME_MINE_ATTR, fameNextLine, type MyFameStanding } from "@/lib/indie/fame";
import { ROUTES } from "@/lib/routes";

/**
 * 지난번 받은 내 자리를 이 탭에 맡겨 둔다(2026-10-30 사용자 "좀 늦게 나온다"). 다시 들어오면 맡긴 값으로 먼저 그리고 뒤에서 새로 받는다.
 * 순위는 실시간 잠정이라 몇 분 낡아도 "내 것이 어디 있나" 를 짚는 데는 충분하다. 저장소가 막힌 브라우저면 그냥 받기만 한다
 */
const STANDING_KEY = "fame-standing";

function readStored(): MyFameStanding | null {
  try {
    const raw = sessionStorage.getItem(STANDING_KEY);
    return raw ? (JSON.parse(raw) as MyFameStanding) : null;
  } catch {
    return null;
  }
}

function store(s: MyFameStanding | null) {
  try {
    if (s) sessionStorage.setItem(STANDING_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STANDING_KEY);
  } catch {}
}

/** 내 게임 카드, 줄에 표시를 붙인다(이전 표시는 지운다). 서버가 그린 마디에 속성 하나만 더한다 — React 가 다시 그리면 사라지지만 그때는 효과가 다시 돈다 */
function mark(st: MyFameStanding | null) {
  document.querySelectorAll(`[${FAME_MINE_ATTR}]`).forEach((e) => e.removeAttribute(FAME_MINE_ATTR));
  if (!st?.rank) return;
  document.querySelector(`[${FAME_CARD_ATTR}="${CSS.escape(st.slug)}"]`)?.setAttribute(FAME_MINE_ATTR, "");
}

export function MyFameMarks() {
  const [s, setS] = useState<MyFameStanding | null>(null);
  useEffect(() => {
    let live = true;
    const apply = (st: MyFameStanding | null) => {
      setS(st);
      mark(st);
    };
    const cached = readStored();
    if (cached) apply(cached);
    fetch(ROUTES.apiMeFame, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { standing: MyFameStanding | null } | null) => {
        if (!live || !j) return;
        store(j.standing);
        apply(j.standing);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  // 10위 안이면 카드 자체가 표시라 따로 그릴 것이 없다
  if (!s || s.rank) return null;

  return (
    <Link
      href={ROUTES.indieMine}
      className="press enter-item grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[var(--radius-md)] border border-dashed border-plum bg-plum-soft p-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-x-4"
    >
      <span className="flex flex-col">
        <span className="text-[15px] font-extrabold text-ink">{M.myOutRank}</span>
        <span className="inline-flex w-fit items-center gap-1 text-[12px] font-bold text-plum">
          <SproutIcon size={13} />
          {M.myBadge}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold text-ink">{s.title}</span>
        <span className="truncate text-[12.5px] font-semibold text-plum">{fameNextLine(s)}</span>
      </span>
      <span className="col-start-2 text-[13px] font-semibold text-plum sm:col-start-auto">{M.myChallenge}</span>
    </Link>
  );
}

