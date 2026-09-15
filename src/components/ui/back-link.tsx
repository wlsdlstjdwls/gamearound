// 되돌아가기 링크 — 상세, 하위 화면의 첫 줄에 선다.
//
// 뽑아낸 이유: 네 화면이 각자 `text-[12.5px] text-dim hover:text-ink` 를 손으로 적고 있었고,
// 그래서 넷 다 "누를 수 있는 것" 으로 보이지 않았다. 12.5px 회색 글자 한 줄은 본문 주석과 구별되지 않고,
// 높이가 16px 이라 손가락으로는 사실상 못 누른다.
//
// 지금은 눌리는 판(hover 배경 + 44px 터치 타깃)을 갖되 시선은 끌지 않는다 — 되돌아가기는
// 이 화면의 주된 일이 아니라 빠져나가는 길이다. 왼쪽 여백을 음수로 당겨 글자 기준선은 제자리에 둔다.
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function BackLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <nav aria-label="브레드크럼" className={cn("-ml-2 flex", className)}>
      <Link
        href={href}
        className="press inline-flex min-h-[var(--touch-target)] items-center gap-1 rounded-lg px-2 text-[12.5px] text-mut transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeftIcon size={15} className="shrink-0" />
        {children}
      </Link>
    </nav>
  );
}
