"use client";
// 목록 격자 + 스크롤 페이징.
//
// 왜 페이지 번호를 버렸나(2026-09-15): 목록은 훑는 화면이지 찾아가는 화면이 아니다.
// "1/162 페이지" 에서 사람이 실제로 쓰는 값은 "다음" 하나뿐이었고, 그 한 번을 누르면 화면이
// 맨 위로 돌아가 보던 자리를 잃었다. 지금은 바닥에 닿으면 이어 붙인다.
//
// 첫 페이지는 서버가 그려서 내려보낸다(children) — 로봇과 JS 가 꺼진 브라우저가 보는 것이 그 한 장이고,
// 그 아래부터만 이 컴포넌트가 맡는다. 이어 붙이는 카드도 서버가 그린다(games/actions 주석).
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "@/components/ui/icons";
import { loadMoreGames } from "@/app/(public)/games/actions";
import { GAMES_GRID_CLASS } from "@/lib/games/grid";
import { GAMES_LIST_MESSAGES } from "@/lib/games/messages";
import type { GameListFilter } from "@/server/services/games";

/**
 * 바닥에서 이만큼 남았을 때 미리 부른다. 카드 한 줄 높이(약 250px)의 두 배 —
 * 0 으로 두면 스크롤이 실제로 끝에 닿은 뒤에야 요청이 나가 매번 빈 바닥을 보게 된다.
 */
const PREFETCH_MARGIN = "500px";

export function GamesInfinite({
  filter,
  initialHasMore,
  children,
}: {
  filter: GameListFilter;
  initialHasMore: boolean;
  children: React.ReactNode;
}) {
  const [pages, setPages] = useState<React.ReactNode[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  // 요청이 겹쳐 같은 페이지를 두 번 붙이는 것을 막는다. state 가 아니라 ref 인 이유는
  // 관찰자 콜백이 옛 렌더의 state 를 붙잡고 있어도 이 값은 늘 최신이어야 해서다
  const busy = useRef(false);

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setFailed(false);
    startTransition(async () => {
      try {
        const { nodes, hasMore: more } = await loadMoreGames(filter, nextPage);
        setPages((prev) => [...prev, nodes]);
        setNextPage((p) => p + 1);
        setHasMore(more);
      } catch {
        // 한 번 실패했다고 목록을 지우지 않는다 — 이미 본 카드는 그대로 두고 다시 누를 길만 준다
        setFailed(true);
      } finally {
        busy.current = false;
      }
    });
  }, [filter, nextPage, hasMore]);

  // 관찰자에게 건네는 "늘 최신인" 콜백. 관찰자가 loadMore 를 직접 붙잡으면 페이지를 한 장 붙일 때마다
  // 콜백 정체가 바뀌어 관찰자를 다시 만들게 되는데, 갓 만든 관찰자는 이미 걸쳐 있는 표적을
  // "지금 막 들어왔다" 고 한 번 더 알린다 — 바닥에 서 있기만 해도 다음 장이 연달아 딸려 왔다.
  const latestLoadMore = useRef(loadMore);
  useEffect(() => {
    latestLoadMore.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    const el = sentinel.current;
    // 실패한 뒤에는 자동으로 다시 시도하지 않는다. 바닥에 머무는 동안 같은 요청이 계속 나가면
    // 끊긴 네트워크에서 요청만 쌓인다 — 다시 시도는 사람이 누른다
    if (!el || !hasMore || failed) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && latestLoadMore.current(), {
      rootMargin: `0px 0px ${PREFETCH_MARGIN} 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
    // loadMore 는 일부러 뺀다(위 상자를 통해 최신 값이 들어간다) — 관찰자는 한 번만 세운다
  }, [hasMore, failed]);

  return (
    <>
      <ul className={GAMES_GRID_CLASS}>
        {children}
        {pages}
      </ul>

      {/* 관찰 지점은 높이 없는 칸이다. 스피너에 관찰자를 붙이면 스피너가 사라지는 순간 관찰도 끊긴다 */}
      <div ref={sentinel} aria-hidden className="h-px" />

      <div className="flex min-h-[44px] flex-col items-center justify-center gap-2" aria-live="polite">
        {isPending && (
          <span className="inline-flex items-center gap-2 text-[12.5px] text-dim">
            <SpinnerIcon size={16} className="text-acc" />
            {GAMES_LIST_MESSAGES.loadingMore}
          </span>
        )}
        {failed && !isPending && (
          <>
            <p className="text-[12.5px] text-danger">{GAMES_LIST_MESSAGES.loadFailed}</p>
            <Button size="sm" variant="secondary" onClick={loadMore}>
              {GAMES_LIST_MESSAGES.retry}
            </Button>
          </>
        )}
        {/* 관찰자가 없는 환경(구형 브라우저, 스크롤이 안 닿는 짧은 화면)에서도 길이 있어야 한다 */}
        {hasMore && !isPending && !failed && (
          <Button size="sm" variant="secondary" onClick={loadMore}>
            {GAMES_LIST_MESSAGES.loadMore}
          </Button>
        )}
        {!hasMore && !isPending && <p className="text-[12px] text-dim-2">{GAMES_LIST_MESSAGES.listEnd}</p>}
      </div>
    </>
  );
}
