// 개발일지 목록(기획서 v2.0 5.2 게시판 목록 공통). 틀은 components/lounge/lounge-board(게시판 공통 틀 + 라운지 보조 메뉴)가 맡는다.
import type { Metadata } from "next";
import { LoungeBoard } from "@/components/lounge/lounge-board";
import { parseBoardQuery } from "@/lib/community/query";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "개발일지" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const query = parseBoardQuery(await searchParams);
  return <LoungeBoard title="개발일지" categories={["devlog"]} base={ROUTES.loungeDevlogs} query={query} />;
}
