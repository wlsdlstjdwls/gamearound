// 경로 표시 한 줄("개발자 라운지 > 내가 만든 게임 > 게임 이름", 목업 crumb, crumb3).
// 머리띠 아래 공통 줄(page-trail)과, 끝 낱말이 데이터라 그 줄이 그릴 수 없는 상세 화면(인디 상세)이 같은 모양을 쓴다.
// 마지막 낱말이 지금 화면이다 — href 를 주지 않는다. 꺾쇠는 아이콘이다(화살표 글자 금지, AGENTS 4장).
// 서버, 클라이언트 양쪽에서 부르므로 "use client" 를 붙이지 않는다.
import { Fragment } from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NAV_TRAIL_MESSAGES as M } from "@/lib/nav";

export type Crumb = { label: string; href?: string };

export function Crumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label={M.crumbLabel}>
      <ol className="flex items-center gap-1 whitespace-nowrap text-[12.5px] text-dim">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${i}-${c.label}`}>
              {i > 0 && (
                <li aria-hidden>
                  <ChevronLeftIcon size={12} className="rotate-180" />
                </li>
              )}
              <li aria-current={last ? "page" : undefined} className={last ? "min-w-0 font-semibold text-ink-2" : undefined}>
                {c.href && !last ? (
                  <Link href={c.href} className="hover:text-ink">
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
