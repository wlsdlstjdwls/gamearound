// 되돌아가기 링크 — 상세, 하위 화면의 첫 줄에 선다.
//
// 뽑아낸 이유: 네 화면이 각자 `text-[12.5px] text-dim hover:text-ink` 를 손으로 적고 있었고,
// 그래서 넷 다 "누를 수 있는 것" 으로 보이지 않았다. 12.5px 회색 글자 한 줄은 본문 주석과 구별되지 않고,
// 높이가 16px 이라 손가락으로는 사실상 못 누른다.
//
// 지금은 눌리는 판(hover 배경 + 44px 터치 타깃)을 갖되 시선은 끌지 않는다 — 되돌아가기는
// 이 화면의 주된 일이 아니라 빠져나가는 길이다. 왼쪽 여백을 음수로 당겨 글자 기준선은 제자리에 둔다.
//
// 터치 타깃을 상자 높이로 만들지 않는 이유(2026-09-15): min-height 44px 을 흐름에 세우면
// 15px 짜리 한 줄 위아래로 14.5px 씩 빈칸이 생기고, 그 아래 섹션 간격 28px 이 또 붙는다.
// 화면 첫 96px 중 81px 이 빈칸이었다. 그래서 상자는 글자에 맞추고, 손가락이 닿는 넓이는
// ::after 로 따로 덮는다 — 이 판은 흐름에 자리를 차지하지 않으므로 여백이 늘지 않는다.
//
// 덮는 방향이 위쪽뿐인 이유: 아래로 넓히면 보이지 않는 판이 다음 섹션 머리를 덮어
// 목록 화면의 "필터와 정렬" 처럼 바로 아래 있는 것의 탭을 가로챈다. 위쪽은 페이지 윗여백이고,
// 그보다 더 올라가도 머리띠가 z-40 으로 덮고 있어 남의 탭을 뺏지 않는다.
//
// 위아래 음수 여백은 셸의 섹션 간격을 되무는 값이다. 아래쪽(-12px)은 가장 좁은 셸(gap 20)을 기준으로 잡았다 —
// 28 을 기준으로 더 당기면 목록, 가격 화면에서 이 줄이 다음 섹션에 붙어 버린다.
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function BackLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <nav aria-label="브레드크럼" className={cn("-mb-3 -ml-2 -mt-[14px] flex", className)}>
      <Link
        href={href}
        className="press relative inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[12.5px] text-mut transition-colors after:absolute after:inset-x-0 after:bottom-0 after:-top-[22px] after:content-[''] hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeftIcon size={15} className="shrink-0" />
        {children}
      </Link>
    </nav>
  );
}
