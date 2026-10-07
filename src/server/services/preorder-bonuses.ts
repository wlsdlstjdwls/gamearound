// 예약 특전 읽기와 관리자 판정. 수집(쓰기)은 sync/preorder-bonuses 가 맡고, 여기는 화면 계약(DTO)만 낸다(규약 §1).
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { gamePlatforms, games, preorderBonuses, preorderBonusPosts } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import { PREORDER_MESSAGES } from "@/lib/preorder/messages";
import type { PreorderAdminRowDto, PreorderBonusDto, PreorderPostDto } from "@/lib/preorder/dto";
import type { PreorderModerationInput } from "@/lib/preorder/schemas";
import { PREORDER_SHOW_AFTER_RELEASE_DAYS } from "@/server/sync/constants";

/** 관리자 화면에 한 번에 띄우는 글 수. 특전 글은 월 1건 안팎이라 이 정도면 1년 치가 넘는다 */
const ADMIN_LIST_LIMIT = 100;

async function bonusesByPost(postIds: string[]): Promise<Map<string, PreorderBonusDto[]>> {
  const out = new Map<string, PreorderBonusDto[]>();
  if (postIds.length === 0) return out;
  const rows = await getDb()
    .select()
    .from(preorderBonuses)
    .where(inArray(preorderBonuses.postId, postIds))
    .orderBy(asc(preorderBonuses.postId), asc(preorderBonuses.sortOrder));
  for (const r of rows) {
    const list = out.get(r.postId) ?? [];
    list.push({ edition: r.edition, name: r.name, retailers: r.retailers, notes: r.notes, imageUrl: r.imageUrl, endsOn: r.endsOn });
    out.set(r.postId, list);
  }
  return out;
}

/**
 * 게임 상세의 예약 특전. 공개 글만, 발매 뒤 한 달까지(PREORDER_SHOW_AFTER_RELEASE_DAYS 주석).
 * 캐시하지 않는다 — 관리자가 숨기면 바로 내려가야 하고, 대부분의 게임은 글이 없어 질의가 가볍다(인덱스 game_id, status).
 */
export async function listPreorderForGame(gameId: string): Promise<PreorderPostDto[]> {
  const posts = await getDb()
    .select({ id: preorderBonusPosts.id, url: preorderBonusPosts.url, title: preorderBonusPosts.title })
    .from(preorderBonusPosts)
    .innerJoin(games, eq(games.id, preorderBonusPosts.gameId))
    .where(
      and(
        eq(preorderBonusPosts.gameId, gameId),
        eq(preorderBonusPosts.status, "published"),
        // 출시일은 판마다 game_platforms 에 있다. 가장 늦은 판을 기준으로 한다 — 스위치2 판이 늦게 나오는 게임이 흔하다
        sql`coalesce((select max(gp.release_date) from ${gamePlatforms} gp where gp.game_id = ${games.id}) >= current_date - ${PREORDER_SHOW_AFTER_RELEASE_DAYS}::int, true)`,
      ),
    )
    .orderBy(desc(preorderBonusPosts.publishedAt));
  const bonuses = await bonusesByPost(posts.map((p) => p.id));
  return posts.map((p) => ({ url: p.url, title: p.title, bonuses: bonuses.get(p.id) ?? [] })).filter((p) => p.bonuses.length > 0);
}

/** 관리자 화면. 검토 대기가 먼저, 그다음 최신순 */
export async function listPreorderForAdmin(): Promise<PreorderAdminRowDto[]> {
  await requireAdmin();
  const rows = await getDb()
    .select({
      id: preorderBonusPosts.id,
      url: preorderBonusPosts.url,
      title: preorderBonusPosts.title,
      publishedAt: preorderBonusPosts.publishedAt,
      status: preorderBonusPosts.status,
      statusReason: preorderBonusPosts.statusReason,
      nsuids: preorderBonusPosts.nsuids,
      gameSlug: games.slug,
      gameTitle: games.titleEn,
      gameTitleKo: games.titleKo,
      bonusCount: sql<number>`(select count(*)::int from ${preorderBonuses} b where b.post_id = ${preorderBonusPosts.id})`,
    })
    .from(preorderBonusPosts)
    .leftJoin(games, eq(games.id, preorderBonusPosts.gameId))
    .orderBy(sql`${preorderBonusPosts.status} = 'review' desc`, desc(preorderBonusPosts.publishedAt))
    .limit(ADMIN_LIST_LIMIT);
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    title: r.title,
    publishedAt: r.publishedAt,
    status: r.status,
    statusReason: r.statusReason,
    nsuids: r.nsuids,
    game: r.gameSlug ? { slug: r.gameSlug, title: r.gameTitleKo ?? r.gameTitle ?? r.gameSlug } : null,
    bonusCount: r.bonusCount,
  }));
}

/** 메뉴 배지 — 검토 대기 글 수 */
export async function countPreorderReview(): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(preorderBonusPosts).where(eq(preorderBonusPosts.status, "review"));
  return row?.n ?? 0;
}

/**
 * 관리자 판정. link 는 게임을 잇고 공개까지 한다(특전이 있을 때) — 잇기만 하고 공개를 따로 누르게 하면 한 글에 두 번 누른다.
 * 돌려주는 slug 는 그 게임 화면을 새로 그리라고 부르는 쪽에 알리는 값이다.
 */
export async function moderatePreorderPost(input: PreorderModerationInput, adminId: string): Promise<{ gameSlug: string | null }> {
  const db = getDb();
  const [post] = await db
    .select({ id: preorderBonusPosts.id, gameId: preorderBonusPosts.gameId, bonusCount: sql<number>`(select count(*)::int from ${preorderBonuses} b where b.post_id = ${preorderBonusPosts.id})` })
    .from(preorderBonusPosts)
    .where(eq(preorderBonusPosts.id, input.postId))
    .limit(1);
  if (!post) throw new Error(PREORDER_MESSAGES.admin.postNotFound);

  let gameId = post.gameId;
  if (input.decision === "link") {
    const [game] = await db.select({ id: games.id }).from(games).where(eq(games.slug, input.gameSlug ?? "")).limit(1);
    if (!game) throw new Error(PREORDER_MESSAGES.admin.gameNotFound);
    gameId = game.id;
  }
  if (input.decision !== "hide" && post.bonusCount === 0) throw new Error(PREORDER_MESSAGES.admin.noBonusCannotPublish);
  if (input.decision === "publish" && !gameId) throw new Error(PREORDER_MESSAGES.admin.needGame);

  await db
    .update(preorderBonusPosts)
    .set({ gameId, status: input.decision === "hide" ? "hidden" : "published", statusReason: null, ...updatedBy("admin", adminId) })
    .where(eq(preorderBonusPosts.id, post.id));

  if (!gameId) return { gameSlug: null };
  const [g] = await db.select({ slug: games.slug }).from(games).where(eq(games.id, gameId)).limit(1);
  return { gameSlug: g?.slug ?? null };
}
