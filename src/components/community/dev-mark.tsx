// 개발자 표지 — 도트(픽셀) 글자 "DEV"(2026-11-18).
//
// 지난 모양: 파란 채운 딱지(10-28 걷음), 체크 + 글자(10-28 ~ 11-18), 먹색 알약 + 체크(11-18 하루). 사용자 "체크 표시도 별로, 뱃지 형태도 별로",
// "좀 멋지게 안 되나? 게임 개발자니까!". 그래서 면도 체크도 없이 8비트 게임 글자처럼 점으로 찍은 DEV 를 이름 옆에 세운다.
// 서비스 로고가 12칸 도트 손전등이라 같은 결이다. 글꼴을 들이지 않고 SVG 네모로 그린다 — 몇 글자 때문에 픽셀 글꼴을 받을 이유가 없다.
// 색은 먹색(currentColor) 하나다(파랑 남발 금지). crispEdges 로 점 가장자리가 흐려지지 않게 한다.
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { cn } from "@/lib/cn";

/** 글자 하나 = 3칸 x 5줄. "#" 가 찍는 칸 */
const GLYPHS = {
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
} as const;
const WORD = ["D", "E", "V"] as const;
/** 글자 폭 3칸 + 사이 1칸 */
const STEP = 4;
/** 한 칸의 화면 크기(px). 2 면 글자 높이가 10px 로 이름 글자(12.5px)의 대문자 높이와 맞는다 */
const CELL = 2;

const W = WORD.length * STEP - 1;
const H = GLYPHS.D.length;

export function DevMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center text-ink", className)} title={M.developerBadge}>
      <svg width={W * CELL} height={H * CELL} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden fill="currentColor">
        {WORD.flatMap((ch, i) =>
          GLYPHS[ch].flatMap((row, y) => [...row].map((c, x) => (c === "#" ? <rect key={`${i}-${x}-${y}`} x={i * STEP + x} y={y} width={1} height={1} /> : null))),
        )}
      </svg>
      <span className="sr-only">{M.developerBadge}</span>
    </span>
  );
}
