// 빈 결과 안내 — 리디자인 원칙 3: "없습니다"로 끝내지 않고 다음 행동을 함께 준다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col items-start gap-2 rounded-[var(--radius-panel)] bg-surface-2 px-6 py-7">
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
