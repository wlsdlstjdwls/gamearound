// 게시판, 라운지 글 고치기와 지우기(2026-10-30 사용자 "수정/삭제 기능 다 제공하나"). 그 전에는 서비스도 화면도 없어서
// 광고를 산 홍보 글조차 오타 하나 못 고쳤다. 글쓴이 본인만 한다 — 운영진은 지우지 않고 숨긴다(services/community/admin).
// 소유자 조건은 질의의 where 에 넣는다(먼저 읽고 비교하지 않는다) — 한 왕복에 끝나고, 읽은 뒤 바뀌는 틈이 없다.
// 관련 게임, 인디 게임을 slug 에서 id 로 바꾸는 규칙은 등록과 같아서 resolvePostRefs 하나를 같이 쓴다(services/community/posts).
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { games, indiePosts, posts, type PostCategory, type PromoType } from "@/server/db/schema";
import { requireUser } from "@/server/services/users";
import { displayTitle } from "@/server/services/games";
import { BOARD_CATEGORIES, isLoungeCategory, LOUNGE_CATEGORIES, takesGame } from "@/lib/community/constants";
import { POST_EDIT_MESSAGES as M } from "@/lib/community/messages";
import type { PostInput } from "@/lib/community/schemas";
import { isRichBody } from "@/lib/community/rich-text";
import { sanitizePostHtml } from "@/lib/community/sanitize";

/** 관련 게임 slug 가 없는 게임일 때. 액션이 그 칸 아래 오류로 바꾼다 */
export class PostGameNotFoundError extends Error {
  constructor() {
    super("post game not found");
    this.name = "PostGameNotFoundError";
  }
}

/** 고른 인디 게임이 없거나 내 게임이 아닐 때(남의 slug 를 손으로 넣은 요청 포함). 액션이 그 칸 아래 오류로 바꾼다 */
export class PostIndieNotFoundError extends Error {
  constructor() {
    super("post indie game not found");
    this.name = "PostIndieNotFoundError";
  }
}

/**
 * 카테고리에 맞는 관련 게임, 인디 게임 id. 등록과 고치기가 같이 쓴다.
 * 라운지 글의 인디 게임은 글쓴이 본인 것만 받는다 — 남의 게임 상세 관련 소식에 글을 끼워 넣지 못하게.
 * 두 조회는 서로 기다릴 일이 없어 나란히 묻는다
 */
export async function resolvePostRefs(input: PostInput, userId: string): Promise<{ gameId: string | null; indiePostId: string | null }> {
  const db = getDb();
  const wantGame = takesGame(input.category) && input.gameSlug !== "";
  const wantIndie = isLoungeCategory(input.category) && input.indieSlug !== "";
  const [g, ip] = await Promise.all([
    wantGame ? db.select({ id: games.id }).from(games).where(eq(games.slug, input.gameSlug)).then((r) => r[0]) : undefined,
    wantIndie ? db.select({ id: indiePosts.id }).from(indiePosts).where(and(eq(indiePosts.slug, input.indieSlug), eq(indiePosts.authorUserId, userId))).then((r) => r[0]) : undefined,
  ]);
  if (wantGame && !g) throw new PostGameNotFoundError();
  if (wantIndie && !ip) throw new PostIndieNotFoundError();
  return { gameId: g?.id ?? null, indiePostId: ip?.id ?? null };
}

/** 카테고리에 맞지 않는 칸을 버린 저장 값. 등록과 고치기가 같이 쓴다 */
export function postColumns(input: PostInput) {
  return {
    category: input.category,
    title: input.title,
    body: isRichBody(input.body) ? sanitizePostHtml(input.body) : input.body,
    spoiler: input.category === "review" && input.spoiler === "yes",
    promoType: input.category === "promo" && input.promoType !== "" ? input.promoType : null,
    link: input.category === "promo" && input.link !== "" ? input.link : null,
  };
}

/** 고치기 화면이 채울 값. 저장 모양(id)은 싣지 않고 화면이 고르는 값(slug)으로 준다 */
export type EditablePostDto = {
  id: string;
  category: PostCategory;
  title: string;
  body: string;
  spoiler: boolean;
  promoType: PromoType | null;
  link: string | null;
  game: { slug: string; title: string } | null;
  indieSlug: string;
};

/** 내 글 하나(고치기 화면). 남의 글이거나 없으면 null — 화면이 404 로 그린다 */
export async function getMyPostForEdit(id: string): Promise<EditablePostDto | null> {
  const u = await requireUser();
  const [row] = await getDb()
    .select({ post: posts, gameSlug: games.slug, gameTitleKo: games.titleKo, gameTitleEn: games.titleEn, indieSlug: indiePosts.slug })
    .from(posts)
    .leftJoin(games, eq(games.id, posts.gameId))
    .leftJoin(indiePosts, eq(indiePosts.id, posts.indiePostId))
    .where(and(eq(posts.id, id), eq(posts.authorUserId, u.id)));
  if (!row) return null;
  const p = row.post;
  return {
    id: p.id,
    category: p.category,
    title: p.title,
    body: p.body,
    spoiler: p.spoiler,
    promoType: p.promoType,
    link: p.link,
    game: row.gameSlug && row.gameTitleEn ? { slug: row.gameSlug, title: displayTitle({ titleKo: row.gameTitleKo, titleEn: row.gameTitleEn }) } : null,
    indieSlug: row.indieSlug ?? "",
  };
}

/** 같은 갈래(게시판 또는 라운지)의 카테고리들 */
function sameGroup(c: PostCategory): readonly PostCategory[] {
  return isLoungeCategory(c) ? LOUNGE_CATEGORIES : BOARD_CATEGORIES;
}

/**
 * 고치기. 갈래(게시판, 라운지)를 넘는 카테고리 변경은 where 가 걸러 0행이 된다 — 그때와 남의 글일 때를 가르려고
 * 0행이면 원인을 한 번 더 묻는다(드문 길이라 평소 왕복은 늘지 않는다)
 */
export async function updatePost(id: string, input: PostInput): Promise<{ id: string; category: PostCategory }> {
  const u = await requireUser();
  const refs = await resolvePostRefs(input, u.id);
  const db = getDb();
  const [row] = await db
    .update(posts)
    .set({ ...postColumns(input), ...refs, ...updatedBy("user", u.id) })
    .where(and(eq(posts.id, id), eq(posts.authorUserId, u.id), inArray(posts.category, [...sameGroup(input.category)])))
    .returning({ id: posts.id, category: posts.category });
  if (row) return row;
  const [mine] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, id), eq(posts.authorUserId, u.id)));
  throw new Error(mine ? M.groupLocked : M.forbidden);
}

/** 지우기. 댓글, 좋아요, 스크랩은 cascade 로 같이 간다(schema-community). 본문 그림, 첨부 파일은 저장소에 남는다(글자 링크만 사라진다) */
export async function deletePost(id: string): Promise<{ category: PostCategory }> {
  const u = await requireUser();
  const [row] = await getDb()
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.authorUserId, u.id)))
    .returning({ category: posts.category });
  if (!row) throw new Error(M.forbidden);
  return row;
}
