// 정보 출처 꼬리표 — 상세 맨 아래(2026-10-26 개편으로 패치 기록 판에서 떼어 혼자 섰다). 목업에는 없지만
// 값이 어디서 왔는지 말하는 자리라 지우지 않는다. 출처가 하나도 없으면 아무것도 그리지 않는다.
import { InfoIcon } from "@/components/ui/icons";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { sourceLabel } from "@/lib/source-label";
import type { GameDetail } from "@/server/services/games";

/**
 * 2026-10-27 맨 아래 혼자 선 판에서 히어로 커버 밑 한 줄로 옮겼다(사용자: "정보 출처는 다른 방식으로, 이미지 하단 공백에 예쁘게").
 * 커버 판이 옆 기둥보다 짧아 밑이 비었고, 맨 아래 판은 거기까지 내려가 읽는 사람이 없었다. 커버 밑 작은 글씨 한 줄이 "이 값은 여기서 왔다" 를
 * 값 바로 곁에서 말한다. 링크는 밑줄 없는 글자, 아직 못 붙인 출처는 옅은 글자로만 둔다.
 */
export function SourceRefs({ refs }: { refs: GameDetail["sourceRefs"] }) {
  if (refs.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11.5px] leading-[1.5] text-dim">
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-mut">
        <InfoIcon size={12} aria-hidden />
        {D.sourcesHeading}
      </span>
      {refs.map((r, i) => (
        <span key={r.source} className="inline-flex items-center gap-x-2">
          {i > 0 && <span aria-hidden className="text-dim-2">|</span>}
          {r.url ? (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline-offset-2 transition-colors hover:text-acc hover:underline">
              {sourceLabel(r.source)}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          ) : (
            <span className="text-dim-2">{sourceLabel(r.source)}</span>
          )}
        </span>
      ))}
    </p>
  );
}
