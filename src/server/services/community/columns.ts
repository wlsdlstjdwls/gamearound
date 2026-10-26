// 목록 한 줄을 뽑는 열과 식 — 글 목록(posts), 반응(reactions), 홈(home)이 같이 쓴다.
// 따로 둔 이유: posts 와 reactions 가 서로를 부르면 순환 import 가 되어, 모듈이 덜 만들어진 순간 값을 집을 수 있다.
import { sql } from "drizzle-orm";
import { posts, users, type PostCategory, type PromoType } from "@/server/db/schema";
import { POPULAR_COMMENT_WEIGHT, postPath } from "@/lib/community/constants";
import type { PostRowDto } from "./dto";

/** 작성자 이름. 닉네임이 없는 계정(옛 가입)은 이메일 앞부분을 가려서 쓴다 — 이메일을 그대로 내면 주소가 공개된다 */
export const authorNameSql = sql<string>`coalesce(${users.displayName}, left(split_part(${users.email}, '@', 1), 2) || '***')`;

/** 인기 점수 식(기획서 7장). 쌓아 둔 수로 계산해 줄마다 집계가 돌지 않는다(schema-community 머리 주석) */
export const popularScoreSql = sql<number>`(${posts.likeCount} + ${posts.commentCount} * ${POPULAR_COMMENT_WEIGHT}::int)`;

export const rowColumns = {
  id: posts.id,
  category: posts.category,
  title: posts.title,
  spoiler: posts.spoiler,
  promoType: posts.promoType,
  authorName: authorNameSql,
  createdAt: posts.createdAt,
  commentCount: posts.commentCount,
  likeCount: posts.likeCount,
  viewCount: posts.viewCount,
};

type Row = { id: string; category: PostCategory; title: string; spoiler: boolean; promoType: PromoType | null; authorName: string; createdAt: Date; commentCount: number; likeCount: number; viewCount: number };

export function toRow(r: Row): PostRowDto {
  return { ...r, href: postPath(r.id, r.category) };
}
