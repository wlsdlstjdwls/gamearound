// 인원 모집 목록(2026-11-18 라운지 시안 C, 기획서 v2 "인디 개발자 커뮤니티: 개발 팁, 인원 모집"). 틀은 components/lounge/lounge-board 가 맡는다.
// 갈래 값은 마이그레이션 0117 로 더한다. 적용 전에는 목록이 비어 선다(services/community/columns 의 categoryIn).
import type { Metadata } from "next";
import { LoungeBoard } from "@/components/lounge/lounge-board";
import { CATEGORY_LABEL } from "@/lib/community/constants";
import { parseBoardQuery } from "@/lib/community/query";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: CATEGORY_LABEL.recruit };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  const query = parseBoardQuery(await searchParams);
  return <LoungeBoard title={CATEGORY_LABEL.recruit} categories={["recruit"]} base={ROUTES.loungeRecruits} query={query} />;
}
