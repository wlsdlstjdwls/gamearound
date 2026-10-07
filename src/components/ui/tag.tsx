// 상태 태그 — 연보라 면 위 보라 글자의 작은 딱지("사전예약", "에디션", 구독 이름, 관리자 역할).
// 같은 모양을 화면마다 손으로 다시 쓰고 있었다(content-kind-head, subscription-badges, 메뉴 두 곳의 역할 딱지). 새 자리는 이걸 쓴다.
// 누르는 것이 아니다 — 눌리는 선택형은 ui/chip 이다.
//
// 선택지 둘은 옛 자리의 모양을 그대로 지키려고 있다. cn 은 클래스를 합치기만 하고 충돌을 풀지 않아서
// (tailwind-merge 없음) className 으로 글자 크기, 줄 높이를 덮으면 이기는 쪽이 CSS 생성 순서에 달린다.
// - tight: 줄 높이를 글자에 붙인다. 값 숫자 옆에 설 때(사전예약). 끄면 부모 줄 높이를 따라 딱지가 한 줄 높이로 선다.
// - small: 11px. 메뉴 머리의 이메일(12px) 밑에 붙는 역할 딱지가 이 크기다.
// sale-badge 의 할인 이름 딱지는 굵기가 bold 라 여기로 오지 않았다.
import { cn } from "@/lib/cn";

type TagOptions = { tight?: boolean; small?: boolean; className?: string };

export function tagClass({ tight = true, small = false, className }: TagOptions = {}): string {
  return cn(
    "inline-flex shrink-0 items-center rounded-[5px] bg-acc-soft px-1.5 py-0.5 font-semibold text-acc",
    small ? "text-[11px]" : "text-[11.5px]",
    tight && "leading-none",
    className,
  );
}

export function Tag({ children, ...options }: TagOptions & { children: React.ReactNode }) {
  return <span className={tagClass(options)}>{children}</span>;
}
