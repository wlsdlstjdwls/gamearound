// 인디 홍보 글 쓰기 — 만들기, 고치기, 지우기, 그림, 신고.
//
// 권한은 질의 조건으로 건다. "글을 찾고 → 주인인지 보고 → 고친다" 로 나누면 사이에 다른 글 id 를 박아 보내는
// 길이 남는다 — 고치기, 지우기는 where 에 authorUserId 를 넣는다(관리자는 예외로 통과).
import "server-only";
import { randomBytes } from "node:crypto";
import { head, del } from "@vercel/blob";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { indiePostImages, indiePostReports, indiePosts } from "@/server/db/schema";
import { deleteBlobs } from "@/server/services/blob-files";
import { slugify } from "@/lib/slug";
import { PHOTO_CONTENT_TYPES } from "@/lib/shops/constants";
import {
  INDIE_IMAGE_MAX,
  INDIE_POSTS_PER_USER_MAX,
  INDIE_REPORT_HIDE_THRESHOLD,
  INDIE_SLUG_SUFFIX_LENGTH,
} from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_REPORT_MESSAGES as R } from "@/lib/indie/messages";
import type { IndieImageRegisterInput, IndiePostInput } from "@/lib/indie/schemas";

/** 글을 고치는 사람. 관리자는 남의 글도 고치고, 그 행위는 감사 컬럼에 admin 으로 남는다 */
export type IndieActor = { userId: string; isAdmin: boolean };

function actorSource(actor: IndieActor) {
  return actor.isAdmin ? ("admin" as const) : ("user" as const);
}

/** 제목 + 무작위 꼬리. 꼬리가 있어서 예약어(new, mine)나 같은 제목 글과 부딪히지 않는다 */
function makeSlug(title: string): string {
  // base36 는 영문 소문자와 숫자라 slug 규칙을 그대로 지킨다
  const tail = BigInt(`0x${randomBytes(8).toString("hex")}`).toString(36).slice(0, INDIE_SLUG_SUFFIX_LENGTH);
  return `${slugify(title)}-${tail}`;
}

/** 이 사람의 글이면 그 행을, 아니면 null. 관리자는 누구 글이든 받는다 */
async function ownedPost(postId: string, actor: IndieActor) {
  const where = actor.isAdmin ? eq(indiePosts.id, postId) : and(eq(indiePosts.id, postId), eq(indiePosts.authorUserId, actor.userId));
  const rows = await getDb().select({ id: indiePosts.id, slug: indiePosts.slug, gameId: indiePosts.gameId }).from(indiePosts).where(where).limit(1);
  return rows[0] ?? null;
}

export async function createIndiePost(userId: string, input: IndiePostInput): Promise<{ id: string; slug: string }> {
  const db = getDb();
  const [{ n }] = await db.select({ n: count() }).from(indiePosts).where(eq(indiePosts.authorUserId, userId));
  if (n >= INDIE_POSTS_PER_USER_MAX) throw new Error(M.tooManyPosts(INDIE_POSTS_PER_USER_MAX));

  const [row] = await db
    .insert(indiePosts)
    .values({
      slug: makeSlug(input.title),
      authorUserId: userId,
      gameId: input.gameId,
      title: input.title,
      tagline: input.tagline,
      body: input.body,
      developerName: input.developerName,
      stage: input.stage,
      platforms: input.platforms,
      releaseNote: input.releaseNote,
      links: input.links,
      youtubeId: input.youtube,
      ...createdBy("user", userId),
    })
    .returning({ id: indiePosts.id, slug: indiePosts.slug });
  return row;
}

/**
 * 고치기. slug 는 그대로 둔다 — 제목을 고칠 때마다 주소가 바뀌면 이미 퍼진 링크가 죽는다.
 * 이은 게임이 바뀌면 확인을 지운다: 확인한 것은 "이 사람과 그 게임" 이지 "이 사람" 이 아니다.
 */
export async function updateIndiePost(postId: string, actor: IndieActor, input: IndiePostInput): Promise<{ slug: string }> {
  const post = await ownedPost(postId, actor);
  if (!post) throw new Error(M.forbidden);
  await getDb()
    .update(indiePosts)
    .set({
      gameId: input.gameId,
      ...(input.gameId !== post.gameId ? { gameLinkVerifiedAt: null } : {}),
      title: input.title,
      tagline: input.tagline,
      body: input.body,
      developerName: input.developerName,
      stage: input.stage,
      platforms: input.platforms,
      releaseNote: input.releaseNote,
      links: input.links,
      youtubeId: input.youtube,
      ...updatedBy(actorSource(actor), actor.userId),
    })
    .where(eq(indiePosts.id, post.id));
  return { slug: post.slug };
}

/** 지우기. 행이 cascade 로 그림 줄을 데려가도 저장소 파일은 남으므로 주소를 먼저 모은다(blob-files 주석) */
export async function deleteIndiePost(postId: string, actor: IndieActor): Promise<{ slug: string; gameId: string | null }> {
  const post = await ownedPost(postId, actor);
  if (!post) throw new Error(M.forbidden);
  const db = getDb();
  const images = await db.select({ url: indiePostImages.url }).from(indiePostImages).where(eq(indiePostImages.postId, post.id));
  await db.delete(indiePosts).where(eq(indiePosts.id, post.id));
  await deleteBlobs(images.map((i) => i.url));
  return { slug: post.slug, gameId: post.gameId };
}

/** 업로드 토큰을 줄 사람인가 — 글 주인이고 장수가 남았나 */
export async function canUploadIndieImage(postId: string, actor: IndieActor): Promise<boolean> {
  if (!(await ownedPost(postId, actor))) return false;
  return (await countImages(postId)) < INDIE_IMAGE_MAX;
}

async function countImages(postId: string): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(indiePostImages).where(eq(indiePostImages.postId, postId));
  return n;
}

/** Blob 에 올린 그림을 글에 적는다. 주소를 믿지 않고 저장소에 되묻는다(매장 사진과 같은 규칙) */
export async function registerIndieImage(input: IndieImageRegisterInput, actor: IndieActor): Promise<{ slug: string }> {
  const post = await ownedPost(input.postId, actor);
  if (!post) throw new Error(M.forbidden);

  const blob = await head(input.pathname).catch(() => null);
  if (!blob || blob.url !== input.url || !(PHOTO_CONTENT_TYPES as readonly string[]).includes(blob.contentType)) {
    throw new Error(M.imageFailed);
  }
  const n = await countImages(post.id);
  if (n >= INDIE_IMAGE_MAX) {
    await del(blob.url).catch(() => undefined);
    throw new Error(M.imageFull(INDIE_IMAGE_MAX));
  }
  await getDb()
    .insert(indiePostImages)
    .values({
      postId: post.id,
      url: blob.url,
      pathname: blob.pathname,
      width: input.width,
      height: input.height,
      sort: n,
      ...createdBy(actorSource(actor), actor.userId),
    })
    .onConflictDoNothing();
  return { slug: post.slug };
}

/** 그림 한 장 지우기. 글 주인 조건을 질의에 넣는다 — 남의 그림 id 를 박아 보내는 길을 막는다 */
export async function removeIndieImage(imageId: string, actor: IndieActor): Promise<{ slug: string }> {
  const db = getDb();
  const rows = await db
    .select({ id: indiePostImages.id, url: indiePostImages.url, postId: indiePostImages.postId })
    .from(indiePostImages)
    .where(eq(indiePostImages.id, imageId))
    .limit(1);
  const image = rows[0];
  const post = image ? await ownedPost(image.postId, actor) : null;
  if (!image || !post) throw new Error(M.forbidden);
  await db.delete(indiePostImages).where(eq(indiePostImages.id, image.id));
  await deleteBlobs([image.url]);
  return { slug: post.slug };
}

/**
 * 이 그림을 맨 앞(커버)으로. 나머지는 원래 순서를 지키며 한 칸씩 민다.
 * sort 를 다시 매기는 이유: 앞 그림을 지우면 번호에 구멍이 나는데, 구멍을 그대로 두면 "몇 번째" 를 묻는 곳마다 어긋난다.
 */
export async function makeIndieCover(imageId: string, actor: IndieActor): Promise<{ slug: string }> {
  const db = getDb();
  const rows = await db.select({ postId: indiePostImages.postId }).from(indiePostImages).where(eq(indiePostImages.id, imageId)).limit(1);
  const post = rows[0] ? await ownedPost(rows[0].postId, actor) : null;
  if (!post) throw new Error(M.forbidden);
  await db.execute(sql`
    update ${indiePostImages} as i
    set sort = r.rn, updated_at = now()
    from (
      select id, row_number() over (order by (id = ${imageId}) desc, sort, created_at) - 1 as rn
      from ${indiePostImages} where post_id = ${post.id}
    ) r
    where i.id = r.id
  `);
  return { slug: post.slug };
}

export type ReportResult = { ok: true; hidden: boolean } | { ok: false; error: string };

/**
 * 신고. 한 사람이 한 번만(PK). 서로 다른 사람의 신고가 문턱을 넘으면 관리자를 기다리지 않고 숨긴다.
 * 이미 숨은 글은 숫자만 센다 — 되살릴 때 관리자가 무엇이 쌓였는지 본다.
 */
export async function reportIndiePost(postId: string, userId: string, reason: string): Promise<ReportResult> {
  const db = getDb();
  const rows = await db.select({ author: indiePosts.authorUserId }).from(indiePosts).where(eq(indiePosts.id, postId)).limit(1);
  if (!rows[0]) return { ok: false, error: R.failed };
  if (rows[0].author === userId) return { ok: false, error: R.own };

  const inserted = await db
    .insert(indiePostReports)
    .values({ postId, userId, reason, ...createdBy("user", userId) })
    .onConflictDoNothing()
    .returning({ postId: indiePostReports.postId });
  if (inserted.length === 0) return { ok: false, error: R.already };

  const [post] = await db
    .update(indiePosts)
    .set({ reportCount: sql`${indiePosts.reportCount} + 1` })
    .where(eq(indiePosts.id, postId))
    .returning({ reportCount: indiePosts.reportCount, status: indiePosts.status });
  if (post.status === "published" && post.reportCount >= INDIE_REPORT_HIDE_THRESHOLD) {
    await db
      .update(indiePosts)
      .set({ status: "hidden", statusReason: R.autoHidden, ...updatedBy("system") })
      .where(eq(indiePosts.id, postId));
    return { ok: true, hidden: true };
  }
  return { ok: true, hidden: false };
}
