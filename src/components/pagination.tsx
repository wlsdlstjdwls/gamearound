// 페이지네이션 — 현재 페이지 주변 창만 노출. 링크 기반이라 클라이언트 JS 가 필요 없다.
import Link from "next/link";
import { pageWindow } from "@/lib/pagination";

const CLS = "press inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-3 text-[12.5px] transition-colors duration-base";
const IDLE = "border border-line-strong text-mut hover:border-ink hover:text-ink";
const ACTIVE = "bg-ink font-semibold text-on-ink";

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

  return (
    <nav aria-label="페이지 이동" className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${CLS} ${IDLE}`}>
          이전
        </Link>
      )}
      {pageWindow(page, totalPages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-dim-2">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={hrefFor(n)}
            aria-label={`${n}페이지`}
            aria-current={n === page ? "page" : undefined}
            className={`${CLS} ${n === page ? ACTIVE : IDLE}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={`${CLS} ${IDLE}`}>
          다음
        </Link>
      )}
    </nav>
  );
}
