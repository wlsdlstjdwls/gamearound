// 목록 한 줄을 뽑는 열과 식 — 글 목록(posts), 반응(reactions), 홈(home)이 같이 쓴다.
// 따로 둔 이유: posts 와 reactions 가 서로를 부르면 순환 import 가 되어, 모듈이 덜 만들어진 순간 값을 집을 수 있다.
import { sql } from "drizzle-orm";
import { games, indiePosts, posts, users, type PostCategory, type PromoType } from "@/server/db/schema";
import { isPublic as indieIsPublic } from "@/server/services/indie/read";
import { POPULAR_COMMENT_WEIGHT, postPath } from "@/lib/community/constants";
import { gamePath } from "@/lib/routes";
import type { PostRowDto } from "./dto";

/** 작성자 이름. 닉네임이 없는 계정(옛 가입)은 이메일 앞부분을 가려서 쓴다 — 이메일을 그대로 내면 주소가 공개된다 */
export const authorNameSql = sql<string>`coalesce(${users.displayName}, left(split_part(${users.email}, '@', 1), 2) || '***')`;

/** 인기 점수 식(기획서 7장). 쌓아 둔 수로 계산해 줄마다 집계가 돌지 않는다(schema-community 머리 주석) */
export const popularScoreSql = sql<number>`(${posts.likeCount} + ${posts.commentCount} * ${POPULAR_COMMENT_WEIGHT}::int)`;

/**
 * 관련 게임의 이름, slug. join 이 아니라 행마다 기본키 한 번 찾는 하위 질의로 둔다 — 줄을 뽑는 질의가 목록, 홈, 반응, 관리자에
 * 흩어져 있어 join 으로 하면 그 질의마다 left join 을 하나씩 달아야 하고, 하나라도 빠지면 그 화면에서만 게임이 사라진다.
 * 한 쪽이 20줄이라 기본키 조회 20번은 질의 한 번 안에서 끝난다(왕복이 늘지 않는다).
 * 이름은 한글 제목이 있으면 그것을 쓴다(검색 자동완성과 같은 규칙, services/games/suggest).
 */
const gameTitleSql = sql<string | null>`(select coalesce(${games.titleKo}, ${games.titleEn}) from ${games} where ${games.id} = ${posts.gameId})`;
const gameSlugSql = sql<string | null>`(select ${games.slug} from ${games} where ${games.id} = ${posts.gameId})`;

/**
 * "개발자" 배지의 근거(목업 brow, postv 의 p.dev): 글쓴이가 공개 화면(내가 만든 게임)에 선 인디 게임을 하나라도 가졌는가.
 * 문턱은 인디 목록과 같은 isPublic(승인, 공개, 표지 있음)이다 — 목록에 없는 게임의 주인에게 배지가 서면 "어느 게임?" 에 답이 없다.
 * 신청만 한 사람(pending), 반려된 사람, 숨겨진 게임만 남은 사람은 아니다 — 배지는 "확인된 개발자" 라는 말이라 확인 안 된 것을 세지 않는다.
 * 관련 게임과 같은 이유로 join 이 아니라 줄마다 exists 하위 질의다. indie_posts_author_idx 를 타서 한 쪽 20줄이 질의 한 번 안에서 끝난다.
 */
const authorIsDeveloperSql = sql<boolean>`exists(select 1 from ${indiePosts} where ${indiePosts.authorUserId} = ${posts.authorUserId} and ${indieIsPublic})`;

export const rowColumns = {
  id: posts.id,
  category: posts.category,
  title: posts.title,
  spoiler: posts.spoiler,
  promoType: posts.promoType,
  authorName: authorNameSql,
  authorIsDeveloper: authorIsDeveloperSql,
  createdAt: posts.createdAt,
  commentCount: posts.commentCount,
  likeCount: posts.likeCount,
  viewCount: posts.viewCount,
  gameTitle: gameTitleSql,
  gameSlug: gameSlugSql,
};

type Row = {
  id: string;
  category: PostCategory;
  title: string;
  spoiler: boolean;
  promoType: PromoType | null;
  authorName: string;
  authorIsDeveloper: boolean;
  createdAt: Date;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  gameTitle: string | null;
  gameSlug: string | null;
};

export function toRow({ gameTitle, gameSlug, ...r }: Row): PostRowDto {
  return { ...r, href: postPath(r.id, r.category), game: gameTitle && gameSlug ? { title: gameTitle, href: gamePath(gameSlug) } : null };
}
