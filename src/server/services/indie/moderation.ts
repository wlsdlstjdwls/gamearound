// 인디 홍보 글 관리 — 신고 검토, 숨김과 되살리기, 게임 연결 확인. 관리자 화면(/admin/indie)이 부른다.
import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { games, indiePostReports, indiePosts, users } from "@/server/db/schema";
import { displayTitle } from "@/server/services/games";
import type { IndieAdminRowDto } from "@/lib/indie/dto";
import type { IndieModerationInput } from "@/lib/indie/schemas";

/** 관리자 화면의 칸. 신고 칸이 첫 칸이다 — 승인 없이 서는 글이라 막는 일이 가장 급하다 */
export const INDIE_ADMIN_TABS = ["reported", "links", "hidden", "all"] as const;
export type IndieAdminTab = (typeof INDIE_ADMIN_TABS)[number];

/** 한 화면에 세우는 줄 수. 처리하면 줄이 빠지는 큐라 쪽 넘기기 대신 앞에서부터 처리한다 */
const ADMIN_LIMIT = 100;

function tabWhere(tab: IndieAdminTab) {
  switch (tab) {
    case "reported":
      return and(eq(indiePosts.status, "published"), gt(indiePosts.reportCount, 0));
    case "links":
      return and(isNotNull(indiePosts.gameId), isNull(indiePosts.gameLinkVerifiedAt));
    case "hidden":
      return eq(indiePosts.status, "hidden");
    case "all":
      return undefined;
  }
}

export async function listIndieForAdmin(tab: IndieAdminTab): Promise<IndieAdminRowDto[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: indiePosts.id,
      slug: indiePosts.slug,
      title: indiePosts.title,
      developerName: indiePosts.developerName,
      authorEmail: users.email,
      status: indiePosts.status,
      statusReason: indiePosts.statusReason,
      reportCount: indiePosts.reportCount,
      gameId: indiePosts.gameId,
      gameLinkVerifiedAt: indiePosts.gameLinkVerifiedAt,
      gameSlug: games.slug,
      gameTitleKo: games.titleKo,
      gameTitleEn: games.titleEn,
      createdAt: indiePosts.createdAt,
    })
    .from(indiePosts)
    .innerJoin(users, eq(users.id, indiePosts.authorUserId))
    .leftJoin(games, eq(games.id, indiePosts.gameId))
    .where(tabWhere(tab))
    .orderBy(tab === "reported" ? desc(indiePosts.reportCount) : desc(indiePosts.createdAt))
    .limit(ADMIN_LIMIT);

  // 신고 사유는 한 번에 모은다. 관리자가 판정하려면 "몇 건" 보다 "무슨 말" 이 필요하다
  const ids = rows.map((r) => r.id);
  const reasons = new Map<string, string[]>();
  if (ids.length > 0) {
    const rs = await db
      .select({ postId: indiePostReports.postId, reason: indiePostReports.reason })
      .from(indiePostReports)
      .where(inArray(indiePostReports.postId, ids))
      .orderBy(desc(indiePostReports.createdAt));
    for (const r of rs) reasons.set(r.postId, [...(reasons.get(r.postId) ?? []), r.reason]);
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    developerName: r.developerName,
    authorEmail: r.authorEmail,
    status: r.status,
    statusReason: r.statusReason,
    reportCount: r.reportCount,
    reportReasons: reasons.get(r.id) ?? [],
    game:
      r.gameId && r.gameSlug && r.gameTitleEn
        ? { id: r.gameId, slug: r.gameSlug, title: displayTitle({ titleKo: r.gameTitleKo, titleEn: r.gameTitleEn }), verified: r.gameLinkVerifiedAt !== null }
        : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** 메뉴 배지 — 신고가 쌓인 공개 글과 확인을 기다리는 연결 */
export async function countIndieAdminQueue(): Promise<number> {
  const [{ n }] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(indiePosts)
    .where(sql`(${tabWhere("reported")}) or (${tabWhere("links")})`);
  return n;
}

/**
 * 판정 하나. 되살리면 신고 수를 0 으로 돌린다 — 이미 본 신고로 다시 문턱을 넘지 않게.
 * 신고 줄은 남긴다: 같은 사람이 같은 글을 다시 신고하지 못하는 장치가 그 줄이다.
 */
export async function moderateIndiePost(input: IndieModerationInput, adminId: string): Promise<{ slug: string; gameId: string | null }> {
  const audit = updatedBy("admin", adminId);
  const set =
    input.decision === "hide"
      ? { status: "hidden" as const, statusReason: input.reason || null, ...audit }
      : input.decision === "restore"
        ? { status: "published" as const, statusReason: null, reportCount: 0, ...audit }
        : input.decision === "verify_link"
          ? { gameLinkVerifiedAt: sql`now()`, ...audit }
          : { gameId: null, gameLinkVerifiedAt: null, ...audit };
  const [row] = await getDb()
    .update(indiePosts)
    .set(set)
    .where(eq(indiePosts.id, input.postId))
    .returning({ slug: indiePosts.slug, gameId: indiePosts.gameId });
  if (!row) throw new Error("not found");
  return row;
}
