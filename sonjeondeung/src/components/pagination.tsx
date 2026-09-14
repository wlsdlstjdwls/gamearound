// 페이지네이션 — 현재 페이지 주변 창만 노출. 링크 기반이라 클라이언트 JS 가 필요 없다.
import Link from "next/link";
import { pageWindow } from "@/lib/pagination";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const cls = "press rounded-md border px-3 py-1.5 text-sm transition-colors duration-base";
  const idle = "border-slate-700 text-slate-300 hover:border-amber-400/60 hover:text-amber-300";

  return (
    <nav aria-label="페이지 이동" className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${cls} ${idle}`}>
          이전
        </Link>
      )}
      {pageWindow(page, totalPages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-slate-600">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={hrefFor(n)}
            aria-label={`${n}페이지`}
            aria-current={n === page ? "page" : undefined}
            className={`${cls} ${n === page ? "border-amber-400 bg-amber-400 font-semibold text-slate-950" : idle}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={`${cls} ${idle}`}>
          다음
        </Link>
      )}
    </nav>
  );
}
