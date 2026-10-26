// 개발일지 목록(기획서 v2.0 5.2 게시판 목록 공통). 틀은 components/community/post-board 가 맡는다.
import type { Metadata } from "next";
import { PostBoard } from "@/components/community/post-board";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { parseBoardQuery } from "@/lib/community/query";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "개발일지" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const query = parseBoardQuery(await searchParams);
  return <PostBoard title="개발일지" categories={["devlog"]} family={LOUNGE_CATEGORIES} allPath={ROUTES.loungeAll} base={ROUTES.loungeDevlogs} query={query} />;
}
