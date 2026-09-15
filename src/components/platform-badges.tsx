// 목록 카드, 검색 결과의 플랫폼 배지.
//
// "Steam 외 2" 를 배지로 바꾼 이유: 목록에서 던지는 질문은 "내 기기에 있나" 라서
// 숫자는 답이 되지 않는다. 무엇이 있는지 그대로 펴 보여 주면 카드를 열지 않고도 답이 난다.
// 여덟 개가 전부 붙는 게임은 없다(2026-09-15 기준 최대 5개) — 자르지 않고 줄바꿈으로 흘린다.
import { PLATFORM_LABEL } from "@/lib/format";
import type { Platform } from "@/server/db/schema";

// 기본값을 두는 이유: 이 배지 하나가 없어서 목록 화면 전체가 죽은 적이 있다(2026-09-15).
// 캐시에 담긴 옛 모양 DTO 에는 platforms 가 없었다 — 근거와 재발 방지는 lib/cache 의 DTO_CACHE_VERSION.
export function PlatformBadges({ platforms = [] }: { platforms?: Platform[] }) {
  if (platforms.length === 0) return <p className="text-[11.5px] text-dim">플랫폼 정보 없음</p>;
  return (
    <ul className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <li
          key={p}
          className="rounded-[5px] border border-line bg-surface-3 px-1.5 py-[2px] text-[11px] font-semibold leading-none text-dim"
        >
          {PLATFORM_LABEL[p] ?? p}
        </li>
      ))}
    </ul>
  );
}
