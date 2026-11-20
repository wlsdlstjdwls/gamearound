"use client";
// 라운지 뼈대 — 라운지 홈이면 홈 뼈대, 게시판(전체 글, 개발일지, 질문/피드백)이면 게시판 뼈대.
//
// 왜 한 파일이 경로를 보고 고르는가(2026-11-20 사용자 "각 탭 누를 때마다 화면 깜빡이네"):
// loading 경계는 그 폴더 레이아웃의 자식 칸을 감싸고, 그 자식 칸의 이름(세그먼트)으로 새로 붙는다.
// 게시판마다 loading 을 두면(또는 게시판 묶음 (boards) 안에 두면) 자식 이름이 all, devlogs, qna 로 바뀌어 이동마다 경계가 새로 붙고,
// 화면 전체가 뼈대로 바뀌었다 돌아왔다(390px 실측: 누르고 600ms 뒤 뼈대 요소 46개, 글 줄 0).
// 이 경계(라운지 폴더)의 자식은 홈(page)과 게시판 묶음 (boards) 둘뿐이라, 게시판 사이를 오갈 때는 이름이 (boards) 그대로다 —
// 경계가 이미 붙어 있어 새 목록이 준비될 때까지 앞 화면이 남는다(React 전환). 누른 칸은 먼저 켜진다(sub-nav, community/board-side-links).
// 그래서 (boards) 묶음을 풀어 게시판 폴더를 라운지 바로 아래로 되돌리면 깜빡임이 돌아온다. 그 안에 loading 을 두어도 마찬가지다.
// 바깥(라운지 홈, 다른 메뉴)에서 처음 들어올 때만 이 경계가 새로 붙어 뼈대가 뜬다 — 그때 경로로 모양을 고른다.
// 글 상세(p/[id])는 제 loading 이 따로 있다.
import { usePathname } from "next/navigation";
import { PostBoardSkeleton } from "@/components/community/skeleton";
import { LoungeHomeSkeleton } from "@/components/lounge/home-skeleton";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { ROUTES } from "@/lib/routes";

/** 게시판마다 머리 설명이 390px 에서 몇 줄로 서는지(2026-11-20 실측). 문구는 lib/community/messages 의 BOARD_PAGE_COPY */
const LEAD_LINES: Record<string, number> = { [ROUTES.loungeAll]: 1, [ROUTES.loungeDevlogs]: 2, [ROUTES.loungeQna]: 2 };

export default function Loading() {
  const pathname = usePathname();
  if (pathname === ROUTES.lounge) return <LoungeHomeSkeleton />;
  return <PostBoardSkeleton menu={LOUNGE_CATEGORIES.length + 1} menuScreen leadLines={LEAD_LINES[pathname] ?? 1} />;
}
