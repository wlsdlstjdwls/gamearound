// 참여 권유 판 — 게임이 아직 몇 개 없는 화면(플레이테스트, 명예의 전당, 슈퍼루키, 모든 인디 게임) 아래에 서는 한 장(2026-11-16).
//
// 사용자 "아직 게임 없는 화면도 비어 보이지 않게, 회원들 유도도". 카드가 한두 장뿐인 화면은 아래가 텅 비어 고장처럼 읽혔다.
// 그 자리를 "여기에 당신 게임이 설 수 있다" 는 권유로 채운다: 그림 하나, 한 줄 제목, 한 줄 설명, 단추 둘(무료 가입, 해당 행동).
// 로그인 여부를 묻지 않는다 — 묻는 순간 캐시된 공개 화면이 요청마다 다시 그려진다. 가입한 사람이 "무료 가입" 을 누르면 가입 화면이 홈으로 돌려보낸다.
// 서버 컴포넌트다(상태 없음). 색은 강조 하나 — 판은 옅은 파랑 면, 단추만 채운 파랑이다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function InvitePanel({
  icon,
  title,
  body,
  primary,
  secondary,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col items-start gap-4 rounded-[var(--radius-panel)] bg-acc-soft px-5 py-6 sm:flex-row sm:items-center sm:gap-5 sm:px-7",
        className,
      )}
    >
      <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface text-acc shadow-[var(--elev-card)]">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="break-keep text-[17px] font-extrabold tracking-[-0.02em] text-ink sm:text-[18px]">{title}</h2>
        <p className="break-keep text-[14px] leading-[1.55] text-mut">{body}</p>
      </div>
      <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
        {secondary && (
          <Link href={secondary.href} className={buttonClass({ variant: "secondary", size: "md", className: "flex-1 sm:flex-none" })}>
            {secondary.label}
          </Link>
        )}
        <Link href={primary.href} className={buttonClass({ variant: "primary", size: "md", className: "flex-1 sm:flex-none" })}>
          {primary.label}
        </Link>
      </div>
    </section>
  );
}
