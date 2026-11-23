// 빈 자리 아이콘 — 옅은 네모 판 위에서 아이콘 하나가 천천히 위아래로 떠 있다. 값이 아직 없는 자리(서비스 안 하는 플랫폼 카드,
// 예상 가격 없는 할인 예측, 나오지 않은 기기의 성능 칸, 패치 기록 없음, 상세의 빈 마디 줄)가 쓴다.
//
// 2026-11-23 사용자 "빈값 표현하는 애니메이션 아이콘은 좀 바꾸자": 전에는 두 벌이었다 — 물결이 퍼지는 원(이 파일)과
// 손전등이 빛을 훑는 그림(ui/empty-scene 의 mini, 상세 빈 줄). 물결은 "불러오는 중" 으로, 손전등과 반짝이는 점은 잔망스러운 장식으로 읽혔다.
// 지금은 한 벌이다: 회색 판, 회색 아이콘, 3px 만 오르내리는 느린 숨. 눈길을 뺏지 않고 "비어 있다" 만 말한다.
// 움직임은 globals.css 의 soon-float 키프레임이고, 움직임 줄이기 설정이면 전역 킬스위치가 멈춘다(JS 타이머 없음).
import { cn } from "@/lib/cn";

/** md 는 카드 한가운데, sm 은 한 줄 안(상세 빈 마디 줄) */
const SIZE = { md: "size-12", sm: "size-9" } as const;

export function FloatingIcon({ children, size = "md", className }: { children: React.ReactNode; size?: keyof typeof SIZE; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-2 text-dim", SIZE[size], className)}>
      <span className="soon-float grid place-items-center">{children}</span>
    </span>
  );
}
