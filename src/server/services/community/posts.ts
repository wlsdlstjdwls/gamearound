// 게시판 글 읽기, 쓰기(기획서 v2.0 5.2, 6.1 "게시판 검색", "전체글/인기글 탭", 6.4 글쓰기).
// 글쓴이 확인은 서비스가 다시 한다(requireUser) — 서버 액션의 검사는 입력 모양만 본다.
import { and, asc, desc, eq, gt, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { games, posts, users, type PostCategory, type PromoType } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { POSTS_PAGE_SIZE, postPath, takesGame, type PopularPeriod, type SearchScope } from "@/lib/community/constants";
import type { PostInput } from "@/lib/community/schemas";
import type { PostDetailDto, PostPage } from "./dto";
import { authorNameSql, popularScoreSql, rowColumns, toRow } from "./columns";
import { isLiked, isSaved } from "./reactions";

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** 검색 조건(기획서 7장): 범위마다 부분 일치, 전체는 제목, 본문, 작성자 셋을 OR */
function searchCond(q: string, scope: SearchScope): SQL | undefined {
  if (!q) return undefined;
  const pattern = `%${escapeLike(q)}%`;
  const title = ilike(posts.title, pattern);
  const body = ilike(posts.body, pattern);
  const author = sql`${authorNameSql} ilike ${pattern}`;
  return { all: or(title, body, author), title, body, author }[scope];
}

export type ListPostsParams = {
  categories: readonly PostCategory[];
  q?: string;
  scope?: SearchScope;
  tab?: "all" | "popular";
  period?: PopularPeriod;
  page?: number;
  promoType?: PromoType | null;
  /** 이 게임(slug)에 이어진 글만(posts.game_id). 게임 상세의 "이 게임 글" 링크가 건다 */
  gameSlug?: string | null;
};

export async function listPosts(p: ListPostsParams): Promise<PostPage> {
  const db = getDb();
  const page = Math.max(1, p.page ?? 1);
  const conds: (SQL | undefined)[] = [eq(posts.status, "published"), inArray(posts.category, [...p.categories]), searchCond(p.q ?? "", p.scope ?? "all")];
  if (p.promoType) conds.push(eq(posts.promoType, p.promoType));
  if (p.gameSlug) conds.push(sql`${posts.gameId} = (select ${games.id} from ${games} where ${games.slug} = ${p.gameSlug})`);
  const popular = p.tab === "popular";
  // 인기글은 반응이 하나라도 있는 글만 줄 세운다 — 0점 글까지 세우면 "인기" 가 그냥 최신순이 된다
  if (popular) conds.push(sql`${popularScoreSql} > 0`);
  if (popular && p.period) conds.push(sql`${posts.createdAt} >= now() - make_interval(days => ${p.period}::int)`);
  const where = and(...conds);
  const order = popular ? [desc(popularScoreSql), desc(posts.createdAt)] : [desc(posts.createdAt)];

  // 건수와 목록은 서로를 기다릴 이유가 없다 — 나란히 보낸다(Neon 왕복 1회)
  const [countRows, rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(posts).innerJoin(users, eq(users.id, posts.authorUserId)).where(where),
    db
      .select(rowColumns)
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorUserId))
      .where(where)
      .orderBy(...order, desc(posts.id))
      .limit(POSTS_PAGE_SIZE)
      .offset((page - 1) * POSTS_PAGE_SIZE),
  ]);
  const total = countRows[0]?.n ?? 0;
  return { items: rows.map(toRow), total, page, totalPages: Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE)) };
}

/** 글 상세 + 조회수 1 올리기. 숨긴 글은 글쓴이와 운영진에게만 보인다 */
export async function getPostDetail(id: string): Promise<PostDetailDto | null> {
  const db = getDb();
  const viewer = await getCurrentUser().catch(() => null);
  const [bumped] = await db.update(posts).set({ viewCount: sql`${posts.viewCount} + 1` }).where(eq(posts.id, id)).returning({ id: posts.id });
  if (!bumped) return null;
  const [row] = await db
    .select({ ...rowColumns, body: posts.body, link: posts.link, authorUserId: posts.authorUserId, status: posts.status })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorUserId))
    .where(eq(posts.id, id));
  if (!row) return null;
  const isMine = viewer?.id === row.authorUserId;
  // 숨긴 글은 글쓴이와 운영진만 연다 — 관리자 게시글 화면에서 숨긴 글을 눌러 내용을 보고 되살릴지 정해야 한다
  if (row.status !== "published" && !isMine && viewer?.role !== "admin") return null;

  const sameCategory = and(eq(posts.category, row.category), eq(posts.status, "published"));
  const [prevRows, nextRows, liked, saved] = await Promise.all([
    db.select({ id: posts.id, title: posts.title }).from(posts).where(and(sameCategory, lt(posts.createdAt, row.createdAt))).orderBy(desc(posts.createdAt)).limit(1),
    db.select({ id: posts.id, title: posts.title }).from(posts).where(and(sameCategory, gt(posts.createdAt, row.createdAt))).orderBy(asc(posts.createdAt)).limit(1),
    viewer ? isLiked(id, viewer.id) : false,
    viewer ? isSaved(id, viewer.id) : false,
  ]);
  const neighbor = (r: { id: string; title: string } | undefined) => (r ? { title: r.title, href: postPath(r.id, row.category) } : null);
  return { ...toRow(row), body: row.body, link: row.link, isMine, liked, saved, prev: neighbor(prevRows[0]), next: neighbor(nextRows[0]) };
}

/** 고른 게임이 카탈로그에 없을 때(지워졌거나 slug 를 손으로 고친 요청). 액션이 관련 게임 칸 아래 오류로 바꾼다 */
export class PostGameNotFoundError extends Error {
  constructor() {
    super("post game not found");
    this.name = "PostGameNotFoundError";
  }
}

/** 예전 상세 주소(/board/p/<id>)를 새 주소로 보낼 때 쓴다. 조회수를 올리지 않는다 — 넘겨받은 화면이 올린다 */
export async function getPostCategory(id: string): Promise<PostCategory | null> {
  const [row] = await getDb().select({ category: posts.category }).from(posts).where(eq(posts.id, id));
  return row?.category ?? null;
}

/**
 * 등록. 카테고리에 맞지 않는 칸은 버린다(리뷰 아닌 글의 스포, 홍보 아닌 글의 유형, 링크, 라운지 글의 게임).
 * 관련 게임은 slug 로 받아 id 로 바꾼다 — 화면은 id 를 모른다(자동완성 응답이 slug 만 준다).
 */
export async function createPost(input: PostInput): Promise<{ id: string; category: PostCategory }> {
  const u = await requireUser();
  const db = getDb();
  let gameId: string | null = null;
  if (takesGame(input.category) && input.gameSlug !== "") {
    const [g] = await db.select({ id: games.id }).from(games).where(eq(games.slug, input.gameSlug));
    if (!g) throw new PostGameNotFoundError();
    gameId = g.id;
  }
  const [row] = await db
    .insert(posts)
    .values({
      category: input.category,
      authorUserId: u.id,
      title: input.title,
      body: input.body,
      spoiler: input.category === "review" && input.spoiler === "yes",
      promoType: input.category === "promo" && input.promoType !== "" ? input.promoType : null,
      link: input.category === "promo" && input.link !== "" ? input.link : null,
      gameId,
      ...createdBy("user", u.id),
    })
    .returning({ id: posts.id, category: posts.category });
  return row;
}

/** 내가 쓴 글(내 활동 S-24). 게시판과 같은 한 쪽 20줄로 끊는다(기획서 4.3) — 글이 쌓이면 한 화면에 수백 줄이 섰다 */
export async function listMyPosts(page = 1): Promise<PostPage> {
  const u = await requireUser();
  const db = getDb();
  const at = Math.max(1, page);
  const where = eq(posts.authorUserId, u.id);
  // 건수와 목록은 서로를 기다릴 이유가 없다 — 나란히 보낸다(listPosts 와 같은 이유)
  const [countRows, rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(posts).where(where),
    db
      .select(rowColumns)
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorUserId))
      .where(where)
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(POSTS_PAGE_SIZE)
      .offset((at - 1) * POSTS_PAGE_SIZE),
  ]);
  const total = countRows[0]?.n ?? 0;
  return { items: rows.map(toRow), total, page: at, totalPages: Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE)) };
}
