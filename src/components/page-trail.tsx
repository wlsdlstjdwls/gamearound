"use client";
// 하위 화면 맨 위 한 줄 — "이전 화면" 과 경로 표시(목업 v2.0 의 crumb: "이전 화면" 아래 "인디 게임 > 명예의 전당").
//
// 화면마다 넣지 않고 머리띠 아래 한 곳에 둔다 — 소속은 하위 메뉴 띠와 같은 표(lib/nav 의 resolveNav)로 정하므로
// 띠가 켠 칸과 경로의 낱말이 늘 같다. 어느 화면에 세울지는 lib/nav 의 trailKind — 상세, 고치기 화면은 제 되돌아가기 링크를 갖고 있어 세우지 않는다
// (게임 게시판 글 상세는 예외로 세운다: 목업 postv 의 "게임 게시판 > 리뷰 > 게시글", lib/nav 의 TRAIL_LEAF_UNDER).
//
// "이전 화면" 은 브라우저 뒤로가기다(목업 S.hist). 다른 사이트에서 바로 들어왔거나 새 탭이면 뒤가 우리 화면이 아니라서
// 그때는 메뉴의 첫 칸(없으면 홈)으로 간다 — 뒤로가기가 사이트 밖으로 튕겨 나가면 고장으로 읽힌다.
// 화살표 글자는 쓰지 않는다(AGENTS 4장) — 방향은 꺾쇠 아이콘과 문구가 말한다.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Crumbs } from "@/components/ui/crumbs";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NAV_TRAIL_MESSAGES as M, resolveNav, trailKind, trailLeaf, TRAIL_NO_CRUMB_SECTIONS } from "@/lib/nav";
import { canGoBack } from "@/lib/nav-history";
import { ROUTES } from "@/lib/routes";

export function PageTrail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { section, sub } = resolveNav(pathname, searchParams);
  const kind = trailKind(pathname, sub);
  if (!kind) return null;
  // 끝 낱말 화면(글 상세, 글쓰기)과 칸 아래 상세(인디 상세)의 뒤는 그 칸(목록)이다 — 메뉴 첫 칸으로 보내면 보던 목록을 잃는다
  const fallback = (kind !== "sub" ? sub?.href : undefined) ?? section?.href ?? ROUTES.home;
  const leaf = trailLeaf(pathname);
  // 경로 낱말: 메뉴 > (칸) > (끝 낱말). 마지막 낱말이 지금 화면이다
  const crumbs = section && kind !== "back" && !TRAIL_NO_CRUMB_SECTIONS.has(section.key) ? [sub?.label, leaf].filter((x): x is string => Boolean(x)) : [];

  return (
    // 한 줄에 둔다(2026-10-27, 사용자: "이전 화면 버튼이나 경로 표시가 너무 많은 영역을 차지한다"). 목업은 두 줄이었다.
    // 되돌아가기와 경로 사이는 세로 헤어라인 하나로 가른다. 아래 -mb 는 Page 의 위 여백과 겹쳐 제목을 끌어올린다
    <div className="mx-auto -mb-3 flex w-full max-w-[var(--page-w)] min-w-0 items-center gap-2.5 px-5 pt-3 sm:px-7">
      <Link
        href={fallback}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !canGoBack()) return;
          e.preventDefault();
          router.back();
        }}
        className="press tap -ml-1.5 inline-flex shrink-0 items-center gap-0.5 rounded-full py-1 pl-1 pr-2.5 text-[12.5px] font-medium text-mut transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeftIcon size={14} />
        {M.back}
      </Link>
      {/* 가운데 낱말(칸)은 그 칸으로 가는 링크다 — 끝 낱말만 지금 화면 */}
      {section && crumbs.length > 0 && (
        <>
          <span aria-hidden className="h-3 w-px shrink-0 bg-line-strong" />
          <div className="min-w-0 overflow-hidden">
            <Crumbs items={[{ label: section.label, href: section.href }, ...crumbs.map((label) => ({ label, href: sub?.href }))]} />
          </div>
        </>
      )}
    </div>
  );
}
