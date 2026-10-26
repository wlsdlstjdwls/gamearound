// 게시판 화면 계약. Drizzle 행을 그대로 흘리지 않는다(AGENTS.md 1장) — 작성자 이름처럼 다른 테이블에서 오는 값을
// 한 덩어리로 받고, 스키마가 바뀌어도 화면은 이 모양만 안다.
import type { PostCategory, PromoType } from "@/server/db/schema";

export type PostRowDto = {
  id: string;
  category: PostCategory;
  title: string;
  spoiler: boolean;
  promoType: PromoType | null;
  authorName: string;
  createdAt: Date;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  href: string;
};

export type PostPage = { items: PostRowDto[]; total: number; page: number; totalPages: number };

export type PostNeighbor = { title: string; href: string } | null;

export type PostDetailDto = PostRowDto & {
  body: string;
  link: string | null;
  isMine: boolean;
  liked: boolean;
  saved: boolean;
  prev: PostNeighbor;
  next: PostNeighbor;
};

export type CommentDto = { id: string; body: string; authorName: string; createdAt: Date; isMine: boolean };

export type BoardHomeDto = {
  today: number;
  counts: Partial<Record<PostCategory, number>>;
  rising: PostRowDto[];
  waiting: PostRowDto[];
  latestPromos: PostRowDto[];
};
