// 급상승 인기글 순위 칸(community/news-blocks 의 RisingBlock). 그 파일이 300줄을 넘어 따로 뺐다.
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { cn } from "@/lib/cn";

/**
 * 순위 숫자. 칸 없이 숫자만 선다(2026-11-18 라운지 시안 C, 사용자 "파란색 남발").
 * 지난 모습(2026-10-28): 1~3위가 파란 네모 + 1위 그라데이션과 트로피였는데, 네모가 사이트의 다른 파란 단추와 같은 모양이라
 * 순위보다 "누를 것" 으로 읽혔고 한 화면의 파랑을 셋이나 늘렸다. 지금은 1~3위를 큰 먹색 숫자로, 4위부터 작은 회색 숫자로 둔다 —
 * 위 셋과 나머지의 무게 차이가 순위를 말한다. 인디 상세 머리의 명예의 전당 딱지(ui/rank-tone)는 따로 그대로다.
 */
const TOP = 3;

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      aria-label={M.rankLabel(rank)}
      className={cn("flex justify-center font-extrabold tabular-nums", rank <= TOP ? "text-[22px] text-ink" : "text-[17px] text-dim")}
    >
      {rank}
    </span>
  );
}
