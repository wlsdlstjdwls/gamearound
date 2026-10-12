// 페이지네이션 — 현재 페이지 주변 창만 노출.
// 칸은 NavChip(ui/nav-pending)이다 — 화면이 NavPendingScope 로 감싸여 있으면 누른 번호가 곧장 켜지고 목록이 흐려진다
// (2026-10-12, 누른 뒤 몇 초 동안 아무 변화가 없던 문제). 틀이 없는 화면에서는 평범한 링크로 동작한다.
import { pageWindow } from "@/lib/pagination";
import { NavChip } from "@/components/ui/nav-pending";

/** 쪽 번호는 한 무리다 — 같은 화면의 다른 고르는 줄(탭, 국가)과 켜짐이 섞이지 않게 이름을 둔다 */
const GROUP = "page";

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
        <NavChip group={GROUP} scroll href={hrefFor(page - 1)} rel="prev" size="page">
          이전
        </NavChip>
      )}
      {pageWindow(page, totalPages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-dim-2">
            …
          </span>
        ) : (
          <NavChip key={n} group={GROUP} scroll current="page" href={hrefFor(n)} aria-label={`${n}페이지`} active={n === page} size="page">
            {n}
          </NavChip>
        ),
      )}
      {page < totalPages && (
        <NavChip group={GROUP} scroll href={hrefFor(page + 1)} rel="next" size="page">
          다음
        </NavChip>
      )}
    </nav>
  );
}
