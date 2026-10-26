// 정보 출처 꼬리표 — 상세 맨 아래(2026-10-26 개편으로 패치 기록 판에서 떼어 혼자 섰다). 목업에는 없지만
// 값이 어디서 왔는지 말하는 자리라 지우지 않는다. 출처가 하나도 없으면 아무것도 그리지 않는다.
import { sectionCardClass, SECTION_SIZE } from "@/components/ui/page";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import type { GameDetail } from "@/server/services/games";

export function SourceRefs({ refs }: { refs: GameDetail["sourceRefs"] }) {
  if (refs.length === 0) return null;
  return (
    <section aria-labelledby="sources-heading" className={sectionCardClass("flex flex-col gap-2.5")}>
      <h2 id="sources-heading" className={SECTION_SIZE.label}>
        {D.sourcesHeading}
      </h2>
      <ul className="flex flex-wrap gap-1.5 text-[12px]">
        {refs.map((r) =>
          r.url ? (
            <li key={r.source}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-1 rounded-full bg-surface-2 px-[11px] py-[5px] text-ink-2 transition-colors hover:bg-surface-3"
              >
                {r.source}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            </li>
          ) : (
            // 아직 못 붙인 출처는 점선으로 둔다 — 면을 주면 "이미 있다" 로 읽힌다
            <li key={r.source} className="rounded-full border border-dashed border-line-strong px-[11px] py-[5px] text-dim-2">
              {r.source}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
