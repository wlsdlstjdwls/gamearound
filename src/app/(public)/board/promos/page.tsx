// 홍보 목록(기획서 v2.0 5.2 게시판 목록 공통). 틀은 components/community/post-board 가 맡는다.
// 목록 위 유료 고정 줄(2026-10-27)은 services/promotions 가 고른다. 약속으로 넘겨 목록 질의와 나란히 풀린다.
import type { Metadata } from "next";
import { PostBoard } from "@/components/community/post-board";
import { BOARD_CATEGORIES } from "@/lib/community/constants";
import { parseBoardQuery } from "@/lib/community/query";
import { ROUTES } from "@/lib/routes";
import { listPinnedPromoPosts } from "@/server/services/promotions";

export const metadata: Metadata = { title: "홍보" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const query = parseBoardQuery(await searchParams);
  return <PostBoard title="홍보" categories={["promo"]} family={BOARD_CATEGORIES} allPath={ROUTES.boardAll} base={ROUTES.boardPromos} query={query} pinned={listPinnedPromoPosts()} />;
}
