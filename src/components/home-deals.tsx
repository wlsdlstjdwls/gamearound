"use client";
// 홈 "지금 할인 중" 격자 — 서버가 그린 공통 줄을 받아 두고, 개인화한 사람이면 마운트 뒤 취향 줄로 갈아 끼운다
// (2026-09-29 사용자 지정: 둘째 줄이던 "내 취향 할인" 을 없애고 첫 줄 자체를 개인화).
//
// 클라이언트에서 받는 이유: 홈 본문은 풀 라우트 캐시라 사람마다 다른 줄을 서버에서 그리면 캐시가 깨진다
// (SessionProvider, api/me/picks 주석과 같은 이유). 칸 수가 같아(HOME_LIMIT) 갈아 끼워도 첫 화면이 밀리지 않는다.
// 받기 전이나 실패하면 공통 줄이 그대로 남는다 — 빈 칸이나 스켈레톤을 끼우지 않는다.
import { useEffect, useState } from "react";
import { GameCard } from "@/components/game-card";
import { useSession } from "@/components/auth/session-provider";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import type { GameSummary } from "@/server/services/games";

export function HomeDeals({ initial }: { initial: GameSummary[] }) {
  const { user, status } = useSession();
  const [personal, setPersonal] = useState<GameSummary[] | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (status !== "ready" || !userId) return;
    const ctrl = new AbortController();
    fetch(ROUTES.apiMePicks, { cache: "no-store", credentials: "same-origin", signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ deals: GameSummary[] | null }>) : { deals: null }))
      .then((body) => setPersonal(body.deals))
      .catch(() => {});
    return () => ctrl.abort();
  }, [status, userId]);

  // 로그아웃하면 남의 취향이 남지 않게 공통 줄로 돌아간다 — 렌더에서 가른다(effect 로 비우면 한 번 더 그린다).
  // 받은 줄이 비면(할인이 하나도 없는 순간) 공통 줄을 둔다
  const items = userId && personal?.length ? personal : initial;

  return (
    <ul className={HOME_GRID_CLASS}>
      {items.map((g, i) => (
        <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
          <GameCard game={g} variant="discount" />
        </li>
      ))}
    </ul>
  );
}
