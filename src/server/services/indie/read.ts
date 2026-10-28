// 인디 홍보 글 읽기 — 공개 목록, 홈 줄, 상세, 게임 상세 마디, 내 글.
//
// 캐시를 걸지 않는다. 글쓴이는 올린 직후 자기 글을 보러 오고, 숨김은 바로 빠져야 한다(신고 누적 숨김이 한 시간
// 남아 있으면 문턱이 무의미하다). 홈만은 페이지 ISR 에 얹혀 있어 쓰기 경로가 revalidatePath 로 민다.
//
// 공개 화면은 "published 이고 커버가 있는 글" 만 본다. 커버 없는 카드는 회색 칸이라 목록이 고장 나 보인다
// (홈 노출 체크리스트: 커버 필수). 상세는 커버가 없어도 열린다 — 글쓴이가 링크를 먼저 퍼뜨릴 수 있다.
import "server-only";
import { makerActiveSql } from "@/server/services/membership/read";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { containsPattern } from "@/lib/like-pattern";
import { games, indiePostImages, indiePosts, type IndieStage } from "@/server/db/schema";
import { displayTitle } from "@/server/services/games";
import { INDIE_HOME_LIMIT, INDIE_HOME_MIN, INDIE_PAGE_SIZE, type IndiePlatform } from "@/lib/indie/constants";
import type { IndieCardDto, IndieDetailDto, IndieGameSectionDto, IndieImageDto, IndieMineRowDto } from "@/lib/indie/dto";
import type { IndieSearchScope } from "@/lib/indie/query";

/** 그 글의 그림이 한 장이라도 있다 — 공개 목록의 문턱. 첫 장이 곧 커버라 "있다" 만 보면 된다 */
const hasCover = sql<boolean>`exists (select 1 from ${indiePostImages} where ${indiePostImages.postId} = ${indiePosts.id})`;

// 승인된 글만 공개 화면에 선다(2026-10-26, 기획서 v2.0 7.1). 승인 대기, 반려 글은 등록현황에서만 보인다
export const isPublic = and(eq(indiePosts.status, "published"), eq(indiePosts.review, "approved"), hasCover);

/** 글 id 들의 그림을 순서대로. 왕복 하나로 모은다 — 카드마다 묻지 않는다 */
async function imagesFor(postIds: string[]): Promise<Map<string, IndieImageDto[]>> {
  const map = new Map<string, IndieImageDto[]>();
  if (postIds.length === 0) return map;
  const rows = await getDb()
    .select({
      id: indiePostImages.id,
      postId: indiePostImages.postId,
      url: indiePostImages.url,
      width: indiePostImages.width,
      height: indiePostImages.height,
    })
    .from(indiePostImages)
    .where(inArray(indiePostImages.postId, postIds))
    .orderBy(asc(indiePostImages.sort), asc(indiePostImages.createdAt));
  for (const { postId, ...img } of rows) {
    const list = map.get(postId) ?? [];
    list.push(img);
    map.set(postId, list);
  }
  return map;
}

export const cardColumns = {
  id: indiePosts.id,
  slug: indiePosts.slug,
  title: indiePosts.title,
  tagline: indiePosts.tagline,
  developerName: indiePosts.developerName,
  stage: indiePosts.stage,
  platforms: indiePosts.platforms,
  genres: indiePosts.genres,
  likeCount: indiePosts.likeCount,
  viewCount: indiePosts.viewCount,
  // 공개 카드의 "등록일" 은 승인된 날이다 — 승인 전에는 어디에도 안 섰으니 신청한 날을 적으면 "오래된 게임" 으로 읽힌다
  registeredAt: sql<Date>`coalesce(${indiePosts.reviewedAt}, ${indiePosts.createdAt})`,
  // 메이커 꼬리표(services/membership 의 makerActiveSql). 줄마다 exists 한 번이라 왕복이 늘지 않는다
  authorIsMaker: makerActiveSql(indiePosts.authorUserId),
};

export type CardRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  developerName: string;
  stage: IndieStage;
  platforms: string[];
  genres: string[];
  likeCount: number;
  viewCount: number;
  registeredAt: Date | string;
  authorIsMaker: boolean;
};

export async function toCards(rows: CardRow[]): Promise<IndieCardDto[]> {
  const images = await imagesFor(rows.map((r) => r.id));
  return rows.flatMap(({ id, platforms, registeredAt, ...r }) => {
    const cover = images.get(id)?.[0];
    // 질의가 커버 있는 글만 골랐지만, 사이에 그림이 지워졌을 수 있다.
    // registeredAt 은 sql 식이라 드라이버가 문자열로 줄 수 있다 — Date 로 한 번 펴서 ISO 로 적는다
    return cover ? [{ ...r, platforms: platforms as IndiePlatform[], registeredAt: new Date(registeredAt).toISOString(), cover }] : [];
  });
}

export type IndieListResult = { items: IndieCardDto[]; total: number; page: number; totalPages: number };

/** 검색 범위마다 보는 칸(목업 bsbar). 내용은 한 줄 소개와 본문, 전체는 넷 모두의 OR 다 */
const SEARCH_COLUMNS = {
  title: [indiePosts.title],
  body: [indiePosts.tagline, indiePosts.body],
  developer: [indiePosts.developerName],
  all: [indiePosts.title, indiePosts.tagline, indiePosts.body, indiePosts.developerName],
} as const satisfies Record<IndieSearchScope, readonly unknown[]>;

/**
 * 공개 목록. q 는 고른 범위(scope) 칸들의 부분 일치다(목업 "게임 이름, 소개 검색" 과 범위 드롭다운).
 */
export async function listIndiePosts(stage: IndieStage | undefined, page: number, q = "", scope: IndieSearchScope = "all"): Promise<IndieListResult> {
  const db = getDb();
  const term = q.trim();
  const like = containsPattern(term);
  const search = term ? or(...SEARCH_COLUMNS[scope].map((c) => ilike(c, like))) : undefined;
  const where = and(isPublic, stage ? eq(indiePosts.stage, stage) : undefined, search);
  const [rows, [{ n }]] = await Promise.all([
    db
      .select(cardColumns)
      .from(indiePosts)
      .where(where)
      .orderBy(desc(indiePosts.createdAt))
      .limit(INDIE_PAGE_SIZE)
      .offset((page - 1) * INDIE_PAGE_SIZE),
    db.select({ n: count() }).from(indiePosts).where(where),
  ]);
  return { items: await toCards(rows), total: n, page, totalPages: Math.max(Math.ceil(n / INDIE_PAGE_SIZE), 1) };
}

/** 홈 줄. 적으면 빈 배열 — 두세 장짜리 줄은 안 세운다(INDIE_HOME_MIN 주석) */
export async function listIndieForHome(): Promise<IndieCardDto[]> {
  const rows = await getDb().select(cardColumns).from(indiePosts).where(isPublic).orderBy(desc(indiePosts.createdAt)).limit(INDIE_HOME_LIMIT);
  if (rows.length < INDIE_HOME_MIN) return [];
  const cards = await toCards(rows);
  return cards.length < INDIE_HOME_MIN ? [] : cards;
}

/** 상세. 숨긴 글은 글쓴이와 관리자만 본다 — 그 판단은 화면이 viewer 로 한다 */
export async function getIndiePostBySlug(slug: string): Promise<IndieDetailDto | null> {
  const rows = await getDb()
    .select({
      post: indiePosts,
      gameSlug: games.slug,
      gameTitleKo: games.titleKo,
      gameTitleEn: games.titleEn,
      authorIsMaker: makerActiveSql(indiePosts.authorUserId),
    })
    .from(indiePosts)
    .leftJoin(games, eq(games.id, indiePosts.gameId))
    .where(eq(indiePosts.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const p = row.post;
  const images = (await imagesFor([p.id])).get(p.id) ?? [];
  return {
    id: p.id,
    slug: p.slug,
    authorUserId: p.authorUserId,
    title: p.title,
    tagline: p.tagline,
    body: p.body,
    developerName: p.developerName,
    stage: p.stage,
    platforms: p.platforms as IndiePlatform[],
    genres: p.genres,
    releaseNote: p.releaseNote,
    links: p.links,
    youtubeId: p.youtubeId,
    images,
    game:
      p.gameId && row.gameSlug && row.gameTitleEn
        ? {
            id: p.gameId,
            slug: row.gameSlug,
            title: displayTitle({ titleKo: row.gameTitleKo, titleEn: row.gameTitleEn }),
            verified: p.gameLinkVerifiedAt !== null,
          }
        : null,
    status: p.status,
    statusReason: p.statusReason,
    review: p.review,
    reviewReason: p.reviewReason,
    likeCount: p.likeCount,
    createdAt: p.createdAt.toISOString(),
    authorIsMaker: row.authorIsMaker,
  };
}

/** 고치기 화면. id 로 찾는다(라우트 indieEditPath 주석) */
export async function getIndiePostSlugById(id: string): Promise<string | null> {
  const rows = await getDb().select({ slug: indiePosts.slug }).from(indiePosts).where(eq(indiePosts.id, id)).limit(1);
  return rows[0]?.slug ?? null;
}

/**
 * 게임 상세의 "개발자가 직접 소개해요" 마디. 관리자가 연결을 확인한 공개 글만 —
 * 확인 없이 붙으면 아무나 남의 게임 화면에 개발자 행세를 할 수 있다(schema-indie 머리 주석).
 */
export async function listIndieForGame(gameId: string): Promise<IndieGameSectionDto[]> {
  const rows = await getDb()
    .select(cardColumns)
    .from(indiePosts)
    .where(and(eq(indiePosts.gameId, gameId), eq(indiePosts.status, "published"), isNotNull(indiePosts.gameLinkVerifiedAt)))
    .orderBy(desc(indiePosts.createdAt));
  const images = await imagesFor(rows.map((r) => r.id));
  return rows.map(({ id, slug, title, tagline, developerName, stage }) => ({
    slug,
    title,
    tagline,
    developerName,
    stage,
    cover: images.get(id)?.[0] ?? null,
  }));
}

export async function listMyIndiePosts(userId: string): Promise<IndieMineRowDto[]> {
  const rows = await getDb()
    .select({
      id: indiePosts.id,
      slug: indiePosts.slug,
      title: indiePosts.title,
      stage: indiePosts.stage,
      platforms: indiePosts.platforms,
      genres: indiePosts.genres,
      status: indiePosts.status,
      statusReason: indiePosts.statusReason,
      review: indiePosts.review,
      reviewReason: indiePosts.reviewReason,
      likeCount: indiePosts.likeCount,
      viewCount: indiePosts.viewCount,
      createdAt: indiePosts.createdAt,
      updatedAt: indiePosts.updatedAt,
      hasCover: sql<boolean>`${hasCover}`,
      tagline: indiePosts.tagline,
      // 대표 그림 한 장만 — 줄마다 그림 전부를 따로 묻지 않게 같은 질의 안에서 고른다(imagesFor 와 같은 순서).
      // 바깥 글 id 를 이름까지 적는다: 고른 칸 안의 ${indiePosts.id} 는 표 이름 없이 "id" 로 나가 안쪽 그림 표의 id 로 읽혔다(2026-10-28 실측, 전부 null)
      coverUrl: sql<string | null>`(select i.url from indie_post_images i where i.post_id = "indie_posts"."id" order by i.sort, i.created_at limit 1)`,
    })
    .from(indiePosts)
    .where(eq(indiePosts.authorUserId, userId))
    .orderBy(desc(indiePosts.createdAt));
  return rows.map((r) => ({ ...r, platforms: r.platforms as IndiePlatform[], hasCover: Boolean(r.hasCover), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
}
