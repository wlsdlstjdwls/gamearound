"use client";
// 하위 화면 맨 위 "이전 화면" 한 줄. 목업 v2.0 은 경로 표시(crumb)도 같이 두었지만 2026-10-29 걷었다(lib/nav 의 trailKind 주석).
//
// 화면마다 넣지 않고 머리띠 아래 한 곳에 둔다 — 소속은 하위 메뉴 띠와 같은 표(lib/nav 의 resolveNav)로 정하므로
// 되돌아갈 곳이 띠가 켠 칸과 같다. 어느 화면에 세울지는 lib/nav 의 trailKind.
//
// "이전 화면" 은 브라우저 뒤로가기다(목업 S.hist). 다른 사이트에서 바로 들어왔거나 새 탭이면 뒤가 우리 화면이 아니라서
// 그때는 메뉴의 첫 칸(없으면 홈)으로 간다 — 뒤로가기가 사이트 밖으로 튕겨 나가면 고장으로 읽힌다.
// 화살표 글자는 쓰지 않는다(AGENTS 4장) — 방향은 꺾쇠 아이콘과 문구가 말한다.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NAV_TRAIL_MESSAGES as M, resolveNav, trailKind } from "@/lib/nav";
import { canGoBack } from "@/lib/nav-history";
import { ROUTES } from "@/lib/routes";

export function PageTrail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { section, sub } = resolveNav(pathname, searchParams);
  const kind = trailKind(pathname, sub);
  if (!kind) return null;
  // 칸 아래 상세(인디 상세)의 뒤는 그 칸(목록)이다 — 메뉴 첫 칸으로 보내면 보던 목록을 잃는다
  const fallback = sub?.href ?? section?.href ?? ROUTES.home;

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
    </div>
  );
}
