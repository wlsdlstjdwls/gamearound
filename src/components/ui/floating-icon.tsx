// 빈 자리 아이콘 — 물결이 퍼지는 원 위에 아이콘이 둥실 떠 있다. 값이 아직 없는 자리(서비스 안 하는 플랫폼 카드, 예상 가격 없는 할인 예측)가 쓴다.
//
// 처음엔 가격 카드의 "서비스하지 않습니다" 칸에만 있었다(2026-11-18 사용자 "너무 밋밋하다, 모션 넣을까"). 2026-11-23 할인 예측의
// "아직 예상 가격이 없습니다" 에도 아이콘과 모션을 달라 해(사용자) 두 곳이 되어 뽑았다(규약 §3).
// 색은 회색 — 없는 자리를 파랑으로 칠하면 눈길을 뺏는다. 움직임은 globals.css 의 soon-ripple, soon-float 키프레임이고
// 움직임 줄이기 설정이면 전역 킬스위치가 멈춘다(JS 타이머 없음).
import { RIPPLE_DELAYS_MS } from "@/lib/motion";

export function FloatingIcon({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="relative grid size-16 place-items-center">
      {RIPPLE_DELAYS_MS.map((delay) => (
        <span key={delay} className="soon-ripple absolute inset-1 rounded-full bg-line" style={{ "--stagger": `${delay}ms` } as React.CSSProperties} />
      ))}
      <span className="soon-float relative flex h-11 w-11 items-center justify-center rounded-full bg-surface text-dim shadow-hair">{children}</span>
    </span>
  );
}
