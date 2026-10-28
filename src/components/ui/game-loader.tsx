// 기다리는 자리 그림 — 로고 손전등이 막대 위를 깡총깡총 달리며 앞을 비추고, 지나간 자리가 파랗게 차오른다(2026-10-28 사용자:
// "'불러오는 중이에요' 같은 문구 대신 로딩바, 게임처럼 캐릭터가 나와서 움직이는 모션"). 글자는 낭독기에만 남긴다(role=status 의 sr-only).
// 뼈대(loading.tsx)가 서는 화면에는 두지 않는다(같은 날 사용자: "스켈레톤이 있는 화면엔 로딩바가 필요 없다") — 뼈대가 이미 기다림을 말한다.
// 쓰는 곳은 뼈대가 없는 작은 자리다: 알림 팝업, 관리자 시트처럼 목록을 따로 받아 오는 칸.
// 캐릭터가 따로 없는 서비스라 로고 심볼(lib/brand 의 도트 손전등)이 그 몫을 한다 — 새 마스코트를 만들면 브랜드가 둘이 된다.
// 진행률을 모르는 기다림이라 막대는 차고 비기를 되풀이한다. 몇 퍼센트인지 아는 척하는 막대는 멈춰 보일 때 더 고장 같다.
// 움직임은 전부 CSS(globals.css 의 .game-loader)다 — JS 타이머로 위치를 옮기지 않는다(AGENTS 6장). 움직임 줄이기 설정이면 전역 킬스위치가 멈추고,
// 쉬는 모양(막대 반쯤, 손전등이 그 끝)으로 선다.
import { BrandSymbol } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { LOADING_MESSAGES } from "@/lib/messages";

/** sm: 팝업, 시트 안의 작은 자리 | md: 화면 하나를 기다리는 자리 */
const SIZE = {
  sm: { width: "w-[160px]", symbol: 22 },
  md: { width: "w-[220px]", symbol: 30 },
} as const;

export function GameLoader({ size = "sm", label = LOADING_MESSAGES.label, className }: { size?: keyof typeof SIZE; label?: string; className?: string }) {
  const s = SIZE[size];
  return (
    <div role="status" className={cn("game-loader mx-auto flex max-w-full flex-col items-stretch pt-1", s.width, className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="game-loader-track">
        <span className="game-loader-fill" />
        <span className="game-loader-runner">
          <span className="game-loader-hop">
            <BrandSymbol size={s.symbol} />
          </span>
        </span>
      </div>
    </div>
  );
}
