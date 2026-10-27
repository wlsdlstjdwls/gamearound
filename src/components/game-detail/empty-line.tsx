// 상세에서 값이 없는 마디를 한 줄로 접는다(2026-10-27 사용자 검수: "빈 칸이 많아 미완성처럼 보인다").
// 할인 예측, 플레이타임, 뉴스, 업데이트와 성능, 가격 추이가 각자 큰 판을 세우고 그 안에 "아직 없어요" 한 줄만 두면
// 화면 절반이 빈 판이 된다. 제목은 남긴다 — 마디가 통째로 사라지면 "이 서비스는 그걸 안 보여 준다" 로 읽힌다.
// 값이 생기면 부르는 쪽이 원래 판으로 돌아간다. 이 줄은 모양만 갖는다(문구는 부르는 쪽이 넘긴다).
import { cn } from "@/lib/cn";

export function EmptyLine({
  id,
  title,
  icon,
  action,
  className,
  children,
}: {
  /** 제목 id — 마디(section)의 이름이 된다 */
  id: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** 줄 끝 단추(알림 설정 등). 값이 없어도 할 수 있는 일이 있으면 같이 접어 둔다 */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-md)] bg-surface px-4 py-3 shadow-hair sm:px-5", className)}
    >
      <h2 id={id} className="flex shrink-0 items-center gap-1.5 text-[14.5px] font-extrabold text-ink">
        {icon && <span className="text-acc">{icon}</span>}
        {title}
      </h2>
      <p className="min-w-0 flex-1 text-[13px] text-dim">{children}</p>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}
