// 게시판 글 읽기, 쓰기(기획서 v2.0 5.2, 6.1 "게시판 검색", "전체글/인기글 탭", 6.4 글쓰기).
// 글쓴이 확인은 서비스가 다시 한다(requireUser) — 서버 액션의 검사는 입력 모양만 본다.
import { and, asc, desc, eq, gt, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { posts, users, type PostCategory, type PromoType } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { POSTS_PAGE_SIZE, postPath, type PopularPeriod, type SearchScope } from "@/lib/community/constants";
import type { PostInput } from "@/lib/community/schemas";
import type { PostDetailDto, PostPage, PostRowDto } from "./dto";
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
};

export async function listPosts(p: ListPostsParams): Promise<PostPage> {
  const db = getDb();
  const page = Math.max(1, p.page ?? 1);
  const conds: (SQL | undefined)[] = [eq(posts.status, "published"), inArray(posts.category, [...p.categories]), searchCond(p.q ?? "", p.scope ?? "all")];
  if (p.promoType) conds.push(eq(posts.promoType, p.promoType));
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

/** 등록. 카테고리에 맞지 않는 칸은 버린다(리뷰 아닌 글의 스포, 홍보 아닌 글의 유형, 링크) */
export async function createPost(input: PostInput): Promise<{ id: string; category: PostCategory }> {
  const u = await requireUser();
  const [row] = await getDb()
    .insert(posts)
    .values({
      category: input.category,
      authorUserId: u.id,
      title: input.title,
      body: input.body,
      spoiler: input.category === "review" && input.spoiler === "yes",
      promoType: input.category === "promo" && input.promoType !== "" ? input.promoType : null,
      link: input.category === "promo" && input.link !== "" ? input.link : null,
      ...createdBy("user", u.id),
    })
    .returning({ id: posts.id, category: posts.category });
  return row;
}

/** 내가 쓴 글(내 활동 S-24) */
export async function listMyPosts(): Promise<PostRowDto[]> {
  const u = await requireUser();
  const rows = await getDb().select(rowColumns).from(posts).innerJoin(users, eq(users.id, posts.authorUserId)).where(eq(posts.authorUserId, u.id)).orderBy(desc(posts.createdAt));
  return rows.map(toRow);
}
