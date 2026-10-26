"use client";
// 하위 화면 맨 위 한 줄 — "이전 화면" 과 경로 표시(목업 v2.0 의 crumb: "이전 화면" 아래 "인디 게임 > 명예의 전당").
//
// 화면마다 넣지 않고 머리띠 아래 한 곳에 둔다 — 소속은 하위 메뉴 띠와 같은 표(lib/nav 의 resolveNav)로 정하므로
// 띠가 켠 칸과 경로의 낱말이 늘 같다. 어느 화면에 세울지는 lib/nav 의 trailKind — 상세, 고치기 화면은 제 되돌아가기 링크를 갖고 있어 세우지 않는다.
//
// "이전 화면" 은 브라우저 뒤로가기다(목업 S.hist). 다른 사이트에서 바로 들어왔거나 새 탭이면 뒤가 우리 화면이 아니라서
// 그때는 메뉴의 첫 칸(없으면 홈)으로 간다 — 뒤로가기가 사이트 밖으로 튕겨 나가면 고장으로 읽힌다.
// 화살표 글자는 쓰지 않는다(AGENTS 4장) — 방향은 꺾쇠 아이콘과 문구가 말한다.
import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NAV_TRAIL_MESSAGES as M, resolveNav, trailKind, TRAIL_LEAF_LABEL, TRAIL_NO_CRUMB_SECTIONS } from "@/lib/nav";
import { ROUTES } from "@/lib/routes";

/** 뒤가 같은 사이트의 화면인가. 처음 연 탭은 history.length 가 1 이고, 바깥에서 왔으면 referrer 가 다른 곳이다 */
function canGoBack(): boolean {
  if (window.history.length <= 1) return false;
  try {
    return document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function PageTrail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { section, sub } = resolveNav(pathname, searchParams);
  const kind = trailKind(pathname, sub);
  if (!kind) return null;
  const fallback = section?.href ?? ROUTES.home;
  const leaf = TRAIL_LEAF_LABEL[pathname];
  // 경로 낱말: 메뉴 > (칸) > (끝 낱말). 마지막 낱말이 지금 화면이다
  const crumbs = section && kind !== "back" && !TRAIL_NO_CRUMB_SECTIONS.has(section.key) ? [sub?.label, leaf].filter((x): x is string => Boolean(x)) : [];

  return (
    // 아래 -mb 는 Page 의 위 여백(pad sub, 22px)과 겹쳐 경로와 제목 사이를 목업처럼 좁힌다
    <div className="mx-auto -mb-2 flex w-full max-w-[var(--page-w)] flex-col gap-1.5 px-5 pt-4 sm:px-7">
      <Link
        href={fallback}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !canGoBack()) return;
          e.preventDefault();
          router.back();
        }}
        className="tap -ml-1 inline-flex w-fit items-center gap-0.5 rounded-md px-1 text-[13px] text-mut hover:text-ink"
      >
        <ChevronLeftIcon size={15} />
        {M.back}
      </Link>
      {section && crumbs.length > 0 && (
        <nav aria-label={M.crumbLabel}>
          <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-dim">
            <li>
              <Link href={section.href} className="hover:text-ink">
                {section.label}
              </Link>
            </li>
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <Fragment key={c}>
                  <li aria-hidden>
                    <ChevronLeftIcon size={12} className="rotate-180" />
                  </li>
                  {/* 가운데 낱말(칸)은 그 칸으로 가는 링크다 — 끝 낱말만 지금 화면 */}
                  <li aria-current={last ? "page" : undefined} className={last ? "font-semibold text-ink-2" : undefined}>
                    {!last && sub ? (
                      <Link href={sub.href} className="hover:text-ink">
                        {c}
                      </Link>
                    ) : (
                      c
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}
