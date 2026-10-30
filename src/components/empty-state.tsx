// 빈 결과 안내 — 리디자인 원칙 3: "없습니다"로 끝내지 않고 다음 행동을 함께 준다.
//
// 2026-10-30 다시 그림(사용자: "데이터 없는 화면에 모션 그래픽으로 이쁘게"). 왼쪽 정렬 회색 판에 글 두 줄이던 것을
// 가운데 정렬 + 손전등이 훑는 그림(ui/empty-scene)으로 바꿨다. 장애 판(ui/status-panel)과 같은 자리 잡기라
// 빈 목록과 장애가 같은 무게로 서되 그림의 몸짓으로 갈린다.
// icon 을 넘긴 자리(가격 알림, 댓글함)는 그 화면이 무엇을 모으는지 그림으로 먼저 말하는 곳이라 손전등 대신 그 그림이 물결 위에 뜬다.
//
// 판 안 작은 빈 자리(댓글 0개, 뉴스 0건 같은 한 줄)는 EmptyNote 다 — 큰 그림이 서면 마디 하나가 화면을 차지한다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyScene } from "@/components/ui/empty-scene";
import { cn } from "@/lib/cn";
import { RIPPLE_DELAYS_MS } from "@/lib/motion";

/** 화면 그림 대신 세우는 동그란 그림. 준비 중 그림(ui/coming-soon)보다 옅은 물결 — 여기는 기다리는 자리가 아니다 */
function IconBadge({ icon }: { icon: React.ReactNode }) {
  return (
    <span aria-hidden className="relative mb-1 grid size-16 place-items-center">
      {RIPPLE_DELAYS_MS.map((delay) => (
        <span key={delay} className="soon-ripple absolute inset-2 rounded-full bg-acc-soft" style={{ "--stagger": `${delay}ms` } as React.CSSProperties} />
      ))}
      <span className="soon-float relative grid size-12 place-items-center rounded-full bg-surface text-acc shadow-1">{icon}</span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  children,
}: {
  title: string;
  /** 손전등 그림 대신 세울 그림(선택). 화면이 무엇을 모으는 곳인지 그림으로 먼저 말한다(2026-10-28 가격 알림 "밋밋하다") */
  icon?: React.ReactNode;
  description?: string;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div role="status" className="enter-item flex flex-col items-center gap-2 rounded-[var(--radius-panel)] bg-surface px-6 py-9 text-center shadow-hair">
      {icon ? <IconBadge icon={icon} /> : <EmptyScene className="mb-2" />}
      <p className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">{title}</p>
      {description && <p className="max-w-[440px] text-[13px] leading-[1.7] text-mut">{description}</p>}
      {(children || action) && (
        <div className="mt-2 flex flex-wrap items-start justify-center gap-2">
          {children}
          {action && (
            <Link href={action.href} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 판 안의 작은 빈 자리 한 줄(댓글 0개, 뉴스 0건, 신청자 0명). 작은 손전등 그림 + 글. 마디 안에 서므로 바탕은 부르는 쪽 판보다 한 단계 옅게 —
 * 회색 상자에 글 한 줄이던 자리들이 각자 여백과 색이 달라 한 화면 안에서도 빈 자리마다 얼굴이 달랐다
 */
export function EmptyNote({ children, title, action, className }: { children?: React.ReactNode; title?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-xl bg-surface-2/70 px-3.5 py-3", className)}>
      <EmptyScene size="mini" className="bg-surface" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13.5px] font-bold text-ink">{title}</p>}
        {children && <p className={cn("text-[12.5px] leading-[1.6]", title ? "text-dim" : "text-mut")}>{children}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
