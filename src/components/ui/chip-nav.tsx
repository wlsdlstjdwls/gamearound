"use client";
// 주소를 바꾸는 칩 — 필터, 정렬처럼 "누르면 서버가 목록을 다시 그려야 하는" 자리에 쓴다.
//
// 왜 ChipLink 를 그냥 쓰지 않나(2026-09-15): /games 는 동적 라우트라 Next 가 미리 받아 두지 않는다.
// 그래서 누른 뒤 응답이 올 때까지 화면에 아무 변화가 없었고(로컬 실측 338ms), 그 공백이
// "버튼이 늦게 눌린다" 로 읽혔다. 두 가지로 메운다.
//
// 1) 마음을 먹은 순간(호버, 포커스, 손가락이 닿은 순간) 그 주소를 통째로 미리 받는다.
//    처음부터 prefetch 를 켜지 않는 이유는 칩이 스무 개가 넘어서다 — 화면에 들어오기만 해도
//    전부 미리 받으면 누르지도 않을 목록 스무 벌을 Neon 에 물어보게 된다.
// 2) 그래도 못 받은 채 눌렸다면(터치, 느린 회선) 이동이 끝날 때까지 칩 위에 옅은 막을 덮는다.
//    막은 곧바로 뜨지 않는다 — 미리 받아 둔 주소로 가면 이동이 한두 프레임에 끝나는데
//    그때도 막이 보이면 누를 때마다 번쩍인다(globals.css 의 --chip-pending-delay).
//
// 이 파일만 "use client" 다. chip.tsx 에 붙이면 chipClass 까지 클라이언트 참조가 되어
// 서버 컴포넌트가 가져다 쓴 자리에서 클래스 문자열이 깨진다(lib/games/grid.ts 주석과 같은 사고).
import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useState } from "react";
import { ChipCheck, chipClass, type ChipSize } from "@/components/ui/chip";

/**
 * 누른 순간 먼저 바뀌는 켜짐. 서버가 준 값(active)이 바뀌면 그 값을 따른다 —
 * 이동이 끝났거나, 다른 칩이나 뒤로 가기로 주소가 바뀐 경우다. 렌더 중 비교로 맞추는 이유는
 * effect 로 맞추면 옛 값이 한 프레임 그려진 뒤 바뀌어 깜빡이기 때문이다(React 문서의 "이전 props 저장" 수법).
 */
export function useOptimisticToggle(active: boolean): [boolean, (v: boolean) => void] {
  const [shown, setShown] = useState(active);
  const [seen, setSeen] = useState(active);
  if (seen !== active) {
    setSeen(active);
    setShown(active);
  }
  return [shown, setShown];
}

/** 새 탭, 새 창으로 여는 클릭은 이 화면이 바뀌지 않으니 켜짐을 미리 바꾸지 않는다 */
export function isPlainClick(e: MouseEvent): boolean {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** 이동이 끝나기 전까지 덮이는 막. Link 의 자손에서만 상태를 읽을 수 있어 조각으로 뗀다 */
function PendingVeil() {
  const { pending } = useLinkStatus();
  return <span aria-hidden data-pending={pending ? "true" : undefined} className="chip-pending" />;
}

type ChipNavLinkProps = Omit<ComponentProps<typeof Link>, "className" | "prefetch"> & {
  active?: boolean;
  /** 고른 칩과 같은 면이지만 aria-current 는 안 단다(chipClass 의 filled 주석) */
  filled?: boolean;
  size?: ChipSize;
  className?: string;
  /** 44px 탭 범위를 상자가 아니라 덧면으로 준다(chip.tsx 주석) */
  compact?: boolean;
  /** 안 고른 칩에도 헤어라인을 준다 — 손가락 기기의 필터 시트(chip.tsx 의 IDLE_OUTLINE 주석) */
  outline?: boolean;
  /**
   * 켜고 끄는 칩(무료 제외, 한국어 지원 등). 앞에 체크 네모가 서고, **누른 순간 켜짐이 바뀐다**.
   * 2026-10-12 사용자: "토글은 빨라야 한다, 조회는 좀 느려도". 주소 이동이 끝나야 active 가 바뀌니
   * 로컬에선 몇 초 동안 눌렀는지조차 안 보였다. 화면은 먼저 바꾸고 목록은 뒤에서 따라온다.
   */
  toggle?: boolean;
};

export function ChipNavLink({ active = false, filled = false, size, className, compact, outline, toggle = false, children, onClick, ...rest }: ChipNavLinkProps) {
  const [warm, setWarm] = useState(false);
  const warmUp = () => setWarm(true);
  const [shown, setShown] = useOptimisticToggle(active);

  return (
    <Link
      aria-current={shown ? "true" : undefined}
      prefetch={warm ? true : false}
      onMouseEnter={warmUp}
      onFocus={warmUp}
      onTouchStart={warmUp}
      onClick={(e) => {
        onClick?.(e);
        if (toggle && isPlainClick(e)) setShown(!shown);
      }}
      // compact 에서는 overflow-hidden 을 걷는다 — 그 모드의 탭 범위는 칩 **밖으로** 8px 넘긴
      // 덧면이라(globals.css 의 .tap-inset) 잘라 내면 손가락 목표가 도로 칩 크기가 된다.
      // 막(PendingVeil)이 튀어나올 걱정은 없다: .chip-pending 이 border-radius 를 물려받는다
      className={chipClass({ active: shown, filled, size, compact, outline, className: `relative ${compact ? "" : "overflow-hidden"} ${className ?? ""}`.trim() })}
      {...rest}
    >
      {toggle && <ChipCheck on={shown} />}
      {children}
      <PendingVeil />
    </Link>
  );
}
