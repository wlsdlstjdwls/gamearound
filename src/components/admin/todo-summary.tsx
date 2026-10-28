// 관리자 첫 화면 맨 위 "지금 손볼 일" — 숫자 한 칸이 곧 그 일을 하는 화면으로 가는 길이다.
//
// 왜 두나(2026-10-26, 기획서 v2.0 2.2, 7.1): 운영진의 첫 일은 등록 승인과 부적절한 글 숨김인데, 첫 화면이 수집 현황뿐이라
// 메뉴 배지를 하나씩 훑어야 무엇이 쌓였는지 알았다. 쌓인 일(승인 대기, 신고, 연결 확인, 매칭, 입점)은 0 이 아니면 파랑으로 세우고,
// 오늘 새 글, 새 댓글은 쌓인 일이 아니라 훑어볼 양이라 늘 같은 무게로 둔다.
//
// 수집 현황 질의와 나란히 돌고 따로 기다린다(page 의 Suspense) — 이 칸이 늦어도 아래 카드는 먼저 선다.
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ADMIN_TODO_MESSAGES as M } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import type { AdminTodoSummary } from "@/server/services/admin-workload";
import { Bone } from "@/components/ui/skeleton";

type Tile = { label: string; n: number; href: string; queue: boolean };

function TodoTile({ tile }: { tile: Tile }) {
  const hot = tile.queue && tile.n > 0;
  return (
    // 이름과 숫자를 한 줄에 둔다(2026-10-28, 컴팩트 회차) — 두 줄 칸 일곱이 첫 화면 위쪽을 한 뼘 먹었다
    <Link
      href={tile.href}
      className={cn(
        "press tap flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 transition-colors duration-fast",
        // 쌓인 일만 파랑 면이다. 나머지는 흰 칸 — 파랑을 남발하면 정작 손볼 칸이 안 띈다
        hot ? "border-acc/40 bg-acc-soft hover:border-acc" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span className={cn("truncate text-[12px]", hot ? "font-semibold text-acc" : "text-mut")}>{tile.label}</span>
      <span className={cn("shrink-0 text-[15px] font-bold tabular-nums", hot ? "text-acc" : tile.queue ? "text-dim-2" : "text-ink")}>
        {tile.n.toLocaleString("ko-KR")}
      </span>
    </Link>
  );
}

/** 약속째 받는다 — 화면이 수집 현황 질의보다 먼저 던져 두고 나란히 돌린다(page 주석) */
export async function TodoSummary({ summary }: { summary: Promise<AdminTodoSummary | null> }) {
  const s = await summary;
  if (!s) return <p className="rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-mut">{M.failed}</p>;
  const queue: Tile[] = [
    { label: M.indieReview, n: s.indieReview, href: ROUTES.adminIndie, queue: true },
    { label: M.indieReported, n: s.indieReported, href: `${ROUTES.adminIndie}?tab=reported`, queue: true },
    { label: M.indieLinks, n: s.indieLinks, href: `${ROUTES.adminIndie}?tab=links`, queue: true },
    { label: M.matches, n: s.matches, href: ROUTES.adminMatches, queue: true },
    { label: M.shops, n: s.shops, href: ROUTES.shopsAdmin, queue: true },
  ];
  const today: Tile[] = [
    { label: M.postsToday, n: s.postsToday, href: ROUTES.adminPosts, queue: false },
    { label: M.commentsToday, n: s.commentsToday, href: `${ROUTES.adminPosts}?tab=comments`, queue: false },
  ];
  const clear = queue.every((t) => t.n === 0);
  return (
    <section aria-labelledby="admin-todo" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="admin-todo" className="text-[14px] font-bold text-ink">
          {M.title}
        </h2>
        {clear && <span className="text-[12px] text-ok">{M.allClear}</span>}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-[repeat(auto-fit,minmax(128px,1fr))]">
        {[...queue, ...today].map((t) => (
          <TodoTile key={t.label} tile={t} />
        ))}
      </div>
    </section>
  );
}

/** 요약을 기다리는 동안의 자리. 높이를 실물과 맞춰 아래 카드가 밀려 내려가지 않게 한다 */
export function TodoSummarySkeleton() {
  return <Bone className="h-[214px] rounded-[var(--radius-panel)] sm:h-[68px]" />;
}
