// 빈 결과 안내 — 리디자인 원칙 3: "없습니다"로 끝내지 않고 다음 행동을 함께 준다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
  icon,
  children,
}: {
  title: string;
  /** 제목 위 동그란 그림(선택). 화면이 무엇을 모으는 곳인지 그림으로 먼저 말한다(2026-10-28 가격 알림 "밋밋하다") */
  icon?: React.ReactNode;
  description?: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col items-start gap-2 rounded-[var(--radius-panel)] bg-surface-2 px-6 py-7">
      {icon && <span aria-hidden className="mb-1 grid size-11 place-items-center rounded-full bg-surface text-acc shadow-1">{icon}</span>}
      <p className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">{title}</p>
      {description && <p className="max-w-[540px] text-[13px] leading-[1.7] text-mut">{description}</p>}
      {children}
      {action && (
        <Link href={action.href} className={`${buttonClass({ variant: "secondary", size: "sm" })} mt-1`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
