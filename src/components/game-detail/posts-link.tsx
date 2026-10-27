// 히어로의 "이 게임 글" 링크 — 게임 상세에서 게시판의 그 게임 글로 간다(2026-10-27 사용자 검수: 흐름 연결).
// 글이 없으면 첫 리뷰를 쓰러 가는 길을 둔다. 수는 상세 캐시 밖에서 받는다 — 글은 사람이 쓰는 값이라 게임 태그를 밀어 주는 사람이 없다.
// 목록은 게시판 전체 글에 game 거름을 건 주소다(lib/community/query) — 리뷰, 공략, 홍보를 한 목록에서 본다.
import Link from "next/link";
import { FileTextIcon } from "@/components/ui/icons";
import { writePath } from "@/lib/community/constants";
import { boardHref, parseBoardQuery } from "@/lib/community/query";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { ROUTES } from "@/lib/routes";
import { countGamePosts } from "@/server/services/community/game-posts";

const LINK =
  "press inline-flex min-h-[var(--touch-target)] w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-acc-soft px-4 text-[13.5px] font-bold text-acc transition-colors duration-base hover:bg-acc hover:text-on-ink";

export async function GamePostsLink({ gameId, slug }: { gameId: string; slug: string }) {
  const n = await nullIfDbUnavailable(countGamePosts(gameId));
  // DB 가 안 열린 날은 링크를 접는다 — 0 으로 그리면 "첫 리뷰" 를 권하는 거짓이 된다
  if (n === null) return null;
  return (
    <Link href={n > 0 ? boardHref(ROUTES.boardAll, parseBoardQuery({}), { game: slug }) : writePath("review")} className={LINK}>
      <FileTextIcon size={16} />
      {n > 0 ? D.postsLink(n) : D.postsFirst}
    </Link>
  );
}
