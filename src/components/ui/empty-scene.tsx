// 빈 화면 그림 — 손전등이 빛을 좌우로 훑고, 빛 끝의 점이 차례로 반짝인다(globals.css 의 .empty-*, 2026-10-30).
//
// 왜 그림인가: 글 두 줄만 있는 빈 판은 "고장" 과 구별되지 않는다. 빛이 움직이면 "찾아봤고 아직 없다" 가 읽힌다.
// 장애 그림(ui/status-panel 의 빛 깜빡임), 준비 중 그림(ui/coming-soon 의 물결과 톱니)과 몸짓을 일부러 갈랐다 —
// 같은 그림이 셋 다에 서면 빈 목록과 장애를 사람이 구별할 길이 없다.
//
// 크기 둘: stage 는 빈 화면 한가운데(EmptyState, 404), mini 는 판 안 한 줄(EmptyNote). 움직임은 같고 자리만 줄인다.
// 이 파일에 "use client" 를 붙이지 않는다 — 서버 화면이 그대로 쓴다. 움직임은 전부 CSS 다(AGENTS §6).
import { BrandSymbol } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { SPARK_DELAYS_MS } from "@/lib/motion";

export type EmptySceneSize = "stage" | "mini";

/**
 * 크기마다의 자리. 손전등 폭, 빛줄기가 시작하는 자리(손전등 머리 끝)와 길이, 점의 자리는 같이 움직여야 해서 한 표에 둔다.
 * 점 자리는 빛이 훑는 부채꼴(-16도 ~ 14도) 안쪽이다 — 밖에 두면 빛이 닿지 않는데 반짝여 따로 노는 장식이 된다
 */
const LAYOUT = {
  stage: {
    box: "h-24 w-40",
    torch: 40,
    torchPos: "left-4 top-1/2 -translate-y-1/2",
    cone: "left-[54px] top-1/2 h-16 w-[100px] -translate-y-1/2",
    sparks: [
      { pos: "left-[112px] top-[30px]", size: "size-1.5" },
      { pos: "left-[136px] top-[46px]", size: "size-2" },
      { pos: "left-[120px] top-[64px]", size: "size-1.5" },
    ],
  },
  mini: {
    box: "h-10 w-16",
    torch: 20,
    torchPos: "left-1 top-1/2 -translate-y-1/2",
    cone: "left-[21px] top-1/2 h-7 w-[42px] -translate-y-1/2",
    sparks: [
      { pos: "left-[44px] top-[12px]", size: "size-1" },
      { pos: "left-[54px] top-[19px]", size: "size-1" },
      { pos: "left-[47px] top-[26px]", size: "size-1" },
    ],
  },
} as const;

export function EmptyScene({ size = "stage", className }: { size?: EmptySceneSize; className?: string }) {
  const l = LAYOUT[size];
  return (
    <span aria-hidden className={cn("relative block shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-2", l.box, className)}>
      <span className={cn("empty-cone", l.cone, size === "mini" && "empty-cone-mini")} />
      {l.sparks.map((sp, i) => (
        <span key={sp.pos} className={cn("empty-spark", sp.pos, sp.size)} style={{ "--stagger": `${SPARK_DELAYS_MS[i]}ms` } as React.CSSProperties} />
      ))}
      <span className={cn("absolute", l.torchPos)}>
        <span className="empty-torch block">
          <BrandSymbol size={l.torch} />
        </span>
      </span>
    </span>
  );
}
