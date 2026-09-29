// 목록 카드, 검색 결과의 플랫폼 배지.
//
// "Steam 외 2" 를 배지로 바꾼 이유: 목록에서 던지는 질문은 "내 기기에 있나" 라서
// 숫자는 답이 되지 않는다. 무엇이 있는지 그대로 펴 보여 주면 카드를 열지 않고도 답이 난다.
// 여덟 개가 전부 붙는 게임은 없다(2026-09-15 기준 최대 5개) — 자르지 않고 줄바꿈으로 흘린다.
//
// ul/li 가 아니라 span 으로 짠다(2026-09-21). 카드(game-card)는 링크 안쪽을 전부 span 으로 세워 두는데
// 그 안에 ul 을 넣으면 브라우저가 상자를 밖으로 끌어내 서버 HTML 과 어긋난다 — 하이드레이션이 깨지고
// 그 트리를 클라이언트가 통째로 다시 그린다. 목록 의미는 aria 로 준다.
import { cn } from "@/lib/cn";
import { PLATFORM_LABEL } from "@/lib/format";
import type { Platform } from "@/server/db/schema";

// 기본값을 두는 이유: 이 배지 하나가 없어서 목록 화면 전체가 죽은 적이 있다(2026-09-15).
// 캐시에 담긴 옛 모양 DTO 에는 platforms 가 없었다 — 근거와 재발 방지는 lib/cache 의 DTO_CACHE_VERSION.
/**
 * highlight: 지금 걸어 둔 플랫폼. 그 배지만 연한 브랜드 면으로 올라온다(2026-09-21).
 *
 * 왜 필요한가: "PS5 만" 으로 걸러도 카드에는 그 게임이 도는 기기가 전부 서 있어서, 내가 무엇으로
 * 걸렀는지가 카드 안에서 사라졌다. 고른 값에 색을 주면 거른 조건과 결과가 같은 자리에서 읽힌다.
 * 꽉 찬 --acc 가 아니라 --acc-soft 인 이유: 카드에서 꽉 찬 면은 할인 스탬프 하나여야 한다.
 */
export function PlatformBadges({ platforms = [], highlight = [] }: { platforms?: Platform[]; highlight?: Platform[] }) {
  if (platforms.length === 0) return <span className="text-[12px] text-dim">플랫폼 정보 없음</span>;
  const picked = new Set(highlight);
  return (
    <span role="list" aria-label="지원 플랫폼" className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <span
          key={p}
          role="listitem"
          // 선을 걷고 면만 남긴다(2026-09-21 리디자인) — 한 줄에 배지가 다섯까지 서는데
          // 테두리가 있으면 그 선들이 제목보다 먼저 읽힌다
          className={cn(
            "rounded-full px-2 py-1 text-[12px] font-semibold leading-none",
            picked.has(p) ? "bg-acc-soft text-acc" : "bg-surface-2 text-mut",
          )}
        >
          {PLATFORM_LABEL[p] ?? p}
        </span>
      ))}
    </span>
  );
}
