// 급상승 인기글 순위 칸(community/news-blocks 의 RisingBlock). 그 파일이 300줄을 넘어 따로 뺐다.
import { TrophyIcon } from "@/components/ui/icons";
import { RANK_TONE } from "@/components/ui/rank-tone";
import { cn } from "@/lib/cn";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";

/**
 * 급상승 순위 칸(2026-10-28 사용자: "나름 순위인데 1위, 2위, 3위가 눈에 띄지도 않는다"). 예전엔 1~3위가 똑같은 파란 네모라
 * 셋 사이에 차이가 없었고, 네모가 사이트의 다른 파란 단추들과 같은 모양이라 "순위" 로 읽히지 않았다.
 * 지금: 1위는 한 단 큰 칸에 파랑에서 보라로 번지는 그라데이션과 트로피, 2위 파랑, 3위 청록으로 셋이 서로 갈리고,
 * 4위부터는 칸 없이 숫자만 둔다 — 위 셋과 나머지의 무게 차이가 순위를 말한다. 색은 ui/rank-tone(인디 상세 딱지와 같은 셋)
 */

export function RankBadge({ rank }: { rank: number }) {
  const top = rank <= RANK_TONE.length;
  if (!top) {
    return (
      <span aria-label={M.rankLabel(rank)} className="flex justify-center text-[17px] font-extrabold tabular-nums text-dim">
        {rank}
      </span>
    );
  }
  return (
    <span className="relative flex justify-center">
      <span
        aria-label={M.rankLabel(rank)}
        className={cn("rank-glint flex items-center justify-center rounded-xl font-black tabular-nums text-on-ink", rank === 1 ? "size-10 text-[19px]" : "size-[34px] text-[16px]", RANK_TONE[rank - 1])}
        style={rankGlint(rank - 1)}
      >
        {rank}
      </span>
      {rank === 1 && (
        <span aria-hidden className="absolute -right-1.5 -top-2 grid size-[18px] place-items-center rounded-full bg-surface text-plum shadow-[var(--elev-1)]">
          <TrophyIcon size={11} strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}

/** 순위 칸 빛의 어긋남 — 1위부터 한 칸씩 늦게 출발해 위에서 아래로 흐른다. 첫 출발은 줄 등장이 끝난 뒤다 */
const RANK_GLINT_START_MS = 900;
const RANK_GLINT_STEP_MS = 260;
function rankGlint(i: number): React.CSSProperties {
  return { "--glint-delay": `${RANK_GLINT_START_MS + i * RANK_GLINT_STEP_MS}ms` } as React.CSSProperties;
}
