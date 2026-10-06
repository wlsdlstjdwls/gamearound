// 상태 태그 — 연보라 면 위 보라 글자의 작은 딱지("사전예약", "에디션", 구독 이름).
// 같은 모양을 화면마다 손으로 다시 쓰고 있었다(sale-badge, content-kind-head, subscription-badges). 새 자리는 이걸 쓴다.
// 누르는 것이 아니다 — 눌리는 선택형은 ui/chip 이다.
import { cn } from "@/lib/cn";

export function tagClass(className?: string): string {
  return cn("inline-flex shrink-0 items-center rounded-[5px] bg-acc-soft px-1.5 py-0.5 text-[11.5px] font-semibold leading-none text-acc", className);
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={tagClass(className)}>
      {children}
    </span>
  );
}
