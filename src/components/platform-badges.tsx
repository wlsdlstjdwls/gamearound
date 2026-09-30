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
import { MoreToggle } from "@/components/ui/more-toggle";
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
/**
 * lowest: 지금 값이 가장 싼 플랫폼. 그 배지가 **맨 앞**에 서고 연한 보라 면을 얻는다.
 * 전에는 카드 맨 아래 "Steam 최저" 글자 줄(09-29 에 걷음)이었다가, 배지 위에 둥실 뜨는 "최저" 말풍선이었다.
 * 말풍선은 같은 날 다시 걷었다(2026-09-30, 사용자: "번잡스럽다") — 카드마다 움직이는 보라 덩어리가
 * 값보다 먼저 눈을 끌었다. 자리(맨 앞)와 색만으로 "여기가 제일 싸다" 를 말하고, 글자는 화면 낭독기에만 준다.
 * 맨 앞이면 "+N" 으로 접히는 쪽에 들어가지도 않는다.
 */
export function PlatformBadges({
  platforms = [],
  highlight = [],
  lowest = null,
  limit,
  narrowLimit = limit,
}: {
  platforms?: Platform[];
  highlight?: Platform[];
  lowest?: Platform | null;
  /**
   * 이만큼만 펴고 나머지는 "+N" 으로 접는다(2026-09-30, 사용자: "3개 플랫폼 이상일 때는 더보기 버튼").
   * 배지가 두세 줄로 접히면 카드마다 키가 달라져 값 줄이 들쭉날쭉했다. 한 줄에 서는 만큼만 편다.
   * 최저 배지는 맨 앞이라 늘 펴진 쪽에 있다.
   */
  limit?: number;
  /**
   * 좁은 화면(sm 아래)에서 펴 두는 수(2026-09-30, 사용자: "모바일에서는 플랫폼 3개까지").
   * 모바일은 카드가 한 줄에 한 장이라 폭이 넓다. 서버는 화면 폭을 모르므로 두 경우를 다 그려 두고
   * CSS 로 하나만 보인다 — 경계 칸의 배지와 "+N" 토글이 폭마다 한 벌씩이다.
   */
  narrowLimit?: number;
}) {
  if (platforms.length === 0) return <span className="text-[12px] text-dim">플랫폼 정보 없음</span>;
  const picked = new Set(highlight);
  const hasLowest = lowest !== null && platforms.includes(lowest);
  const ordered = hasLowest ? [lowest, ...platforms.filter((p) => p !== lowest)] : platforms;
  const cutOf = (n: number | undefined) => (n !== undefined && ordered.length > n ? n : ordered.length);
  const wide = cutOf(limit);
  const narrow = cutOf(narrowLimit);
  const shown = Math.max(wide, narrow);

  // i 번째 배지가 어느 폭에서 펴지는가 — 둘 다면 늘, 한쪽만이면 그 폭에서만
  const visibility = (i: number) => (i < wide && i < narrow ? "" : i < narrow ? "sm:hidden" : "hidden sm:inline-block");

  const badge = (p: Platform, i = 0, inPanel = false) => (
    <span
      key={p}
      role="listitem"
      // 선을 걷고 면만 남긴다(2026-09-21 리디자인) — 한 줄에 배지가 다섯까지 서는데
      // 테두리가 있으면 그 선들이 제목보다 먼저 읽힌다
      className={cn(
        "whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-semibold leading-none",
        !inPanel && visibility(i),
        picked.has(p) ? "bg-acc-soft text-acc" : "bg-surface-2 text-mut",
        p === lowest && "bg-acc-soft font-bold text-acc",
      )}
    >
      {PLATFORM_LABEL[p] ?? p}
      {p === lowest && <span className="sr-only"> 최저가</span>}
    </span>
  );

  const toggle = (from: number, className: string) => {
    const rest = ordered.slice(from);
    if (rest.length === 0) return null;
    return (
      <MoreToggle
        count={rest.length}
        label={`플랫폼 ${rest.length}개 더 보기`}
        wrapClassName={className}
        className="bg-surface-2 text-dim hover:bg-surface-3 hover:text-ink"
      >
        {rest.map((p) => badge(p, 0, true))}
      </MoreToggle>
    );
  };
  return (
    <span role="list" aria-label="지원 플랫폼" className="flex flex-wrap gap-1">
      {ordered.slice(0, shown).map((p, i) => badge(p, i))}
      {/* 좁은 폭, 넓은 폭 토글이 같은 수에서 끊기면 하나만 둔다 */}
      {narrow === wide ? (
        toggle(wide, "inline-flex")
      ) : (
        <>
          {toggle(narrow, "inline-flex sm:hidden")}
          {toggle(wide, "hidden sm:inline-flex")}
        </>
      )}
    </span>
  );
}
