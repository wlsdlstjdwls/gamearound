"use client";

// 관리자 메뉴 — 넓은 화면은 왼쪽 기둥, 좁은 화면은 **바닥에 붙은 띠**(모바일 앱과 같은 자리).
//
// **왜 기둥인가**(2026-09-21 구조 교체): 앞 판은 일곱 칸을 머리 위 한 줄에 늘어놓았다.
// 그 줄은 본문 폭을 그대로 나눠 쓰기 때문에 칸이 늘수록 하나하나가 좁아지고, 늘어난 만큼
// 글자가 작아져 "누를 곳을 찾기 어렵다" 가 됐다. 기둥은 칸이 늘어도 칸 폭이 그대로다 —
// 세로로 한 칸 더 쌓일 뿐이다. 관리자 화면은 앞으로도 칸이 는다(축이 붙을 때마다 검수 자리가 생긴다).
// 구조는 smokespot 관리자 콘솔을 따랐다(넓은 화면 왼쪽 기둥, 묶음 제목, 오른쪽 끝 배지).
//
// 묶은 기준은 화면 이름이 아니라 **관리자가 그 자리에서 하는 일**이다.
// 수집은 읽기만 하는 자리(무엇이 돌았나), 검수는 사람이 판정해야 줄이 줄어드는 자리,
// 커뮤니티는 사람이 올린 글, 수익은 돈이 오가는 설정, 매장은 입점 축, 운영은 서비스 자체를 꾸리는 자리다.
//
// **낱말은 ADMIN_NAV 한곳에서만 정한다.** 메뉴에서 본 말과 들어간 화면의 제목이 다르면
// 같은 곳인지 의심하게 된다.
//
// 고른 칸은 **브랜드 파랑 면**이다. 앞서 쓰던 --surface-3 은 메뉴가 얹힌 --surface-2 와 한 단
// 차이라 훑어서는 어느 칸이 켜져 있는지 보이지 않았다. 칩과 같은 짝(bg-acc + text-on-ink)이다.
//
// **좁은 화면은 왜 바닥 띠인가**(2026-09-22, "상단 메뉴가 보기 불편하다" → "모바일앱처럼 하단에"):
// 앞 판은 칸 일곱을 머리 위에서 가로로 미는 한 줄에 늘어놓았다. 화면에 들어오는 건 둘 반이고
// 미끄러진다는 표시가 없어서 나머지가 있다는 사실 자체가 안 보였다. 세 번째 칸은 늘 글자가 잘린 채
// 서 있었고, 지금 보는 화면이 오른쪽 끝이면 그 표시(파랑 면)조차 화면 밖이었다.
// 바닥은 손가락이 이미 가 있는 자리라 칸이 다섯이면 미는 일 없이 전부 닿는다.
//
// **다섯 칸에 일곱을 어떻게 넣나**: 넣지 않는다. 자주 가는 넷을 세우고 마지막 칸은 더보기다.
// 더보기는 기둥과 **똑같은 메뉴**를 시트로 펴므로 일곱 전부와 서비스 화면으로 가는 길이 거기 있다.
// 넷을 고른 기준은 "거기서 할 일이 있는가" 다 — 실행 로그는 읽기만 하는 자리고(수집 현황에서도 간다),
// 상품 매핑과 입점 신청은 들어올 물건이 아직 드물다(배지가 서면 더보기에서도 보인다).
//
// 남은 일 수는 **약속(Promise)으로 받아 배지 자리에서만 기다린다.** 회사 검수 수를 뽑는 질의가
// games 전수 훑기(실측 27ms, 왕복까지 두 번)라서, 그 값을 메뉴가 기다리면 관리자가 누르는
// 모든 화면이 그만큼 늦게 뜬다. 메뉴는 먼저 그리고 숫자만 나중에 앉힌다.
import { useActivePath } from "@/components/admin/program-shell/store";
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/sheet";
import { MenuIcon } from "@/components/ui/icons";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { ComingSoon } from "@/components/ui/coming-soon";

import { AdminRail } from "@/components/admin/admin-rail";
import { Badge, ITEMS, ItemBody, isActive, GROUPS, type AdminNavCounts, type Item } from "@/components/admin/admin-nav-items";
export type { AdminNavCounts } from "@/components/admin/admin-nav-items";

/**
 * 바닥 띠에 세울 칸. **GROUPS 에서 골라 온다** — 여기서 이름과 그림을 다시 적으면
 * 기둥과 띠가 다른 말을 하기 시작한다(주소만 적고 나머지는 원본에서 끌어온다).
 */
// 2026-10-26: 회사 이름 자리에 인디 홍보를 세웠다. 등록 승인은 신청한 사람이 기다리는 줄이라 손에서 바로 닿아야 하고,
// 회사 이름은 수집이 매일 다시 묻는 자리라 더보기에서 가도 늦지 않다(배지는 더보기 시트에도 선다)
const TAB_HREFS: readonly string[] = [ROUTES.admin, ROUTES.adminMatches, ROUTES.adminIndie, ROUTES.adminTasks];
const TABS = TAB_HREFS.map((href) => {
  const item = ITEMS.find((i) => i.href === href);
  if (!item) throw new Error(`바닥 띠에 세울 칸이 GROUPS 에 없다: ${href}`);
  return item;
});

/** 바닥 띠 칸 하나의 속. 그림은 켜진 칸만 브랜드 색 알약을 입는다 */
function TabBody({ item, active, counts }: { item: Item; active: boolean; counts: Promise<AdminNavCounts | null> }) {
  const { Icon } = item;
  return (
    <>
      <span
        className={cn(
          "relative flex h-7 w-[46px] items-center justify-center rounded-full transition-colors duration-base",
          active ? "bg-acc-soft text-acc" : "text-dim",
        )}
      >
        <Icon size={19} />
        {item.pick && (
          // 배지는 그림 위 오른쪽 귀퉁이에 얹는다. 켜진 칸이어도 색을 바꾸지 않는다 —
          // 바닥 띠의 켜짐은 면이 아니라 색이라, 배지가 그 색에 묻힐 일이 없다
          <Suspense fallback={null}>
            <Badge counts={counts} pick={item.pick} active={false} className="absolute -right-1.5 -top-1" />
          </Suspense>
        )}
      </span>
      <span className={cn("text-[10.5px] leading-none", active ? "font-bold text-acc" : "text-dim")}>{item.label}</span>
    </>
  );
}

export function AdminNav({
  counts,
  initialCollapsed,
  initialOpened,
}: {
  counts: Promise<AdminNavCounts | null>;
  /** 넓은 화면 기둥이 접힌 채로 시작하나(쿠키, 레이아웃이 읽는다) */
  initialCollapsed: boolean;
  /** 기둥에서 펼쳐 둔 묶음(쿠키). 나머지는 접혀 있다 */
  initialOpened: string[];
}) {
  // 탭 껍데기가 있으면 고른 탭의 칸을 켠다 — 바깥 주소는 처음 연 화면에 머문다(program-shell)
  const current = usePathname();
  const pathname = useActivePath() ?? current;
  /** 지금 사유를 말하고 있는 칸. 한 번에 하나만 뜬다 */
  const [soon, setSoon] = useState<Item | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /** 링크와 버튼이 같은 모양이어야 한다. 아직 열지 않은 칸만 버튼이고 나머지는 전부 링크다 */
  const itemClass = (active: boolean) =>
    cn(
      // 마우스 화면에서는 36px 칸이다(2026-10-28, "투박하다, 컴팩트하게"). 칸 열여섯이 44px 씩 서서 기둥이 첫 화면을 넘겼고
      // 아래 묶음(수익, 운영)은 굴려야 보였다. 손가락 화면(시트)은 44px 그대로다
      "press flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors [@media(pointer:fine)]:min-h-9",
      active ? "bg-acc font-semibold text-on-ink" : "font-medium text-mut hover:bg-surface-2 hover:text-ink",
    );

  const render = (item: Item) => {
    const active = isActive(pathname, item.href);
    const body = <ItemBody item={item} active={active} counts={counts} iconSize={16} badgeClassName="ml-auto" />;
    return item.soon ? (
      <button key={item.href} type="button" onClick={() => setSoon(item)} className={cn(itemClass(active), "w-full text-left")}>
        {body}
      </button>
    ) : (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
        {body}
      </Link>
    );
  };

  /** 칸 전부. 기둥과 더보기 시트가 **같은 것**을 쓴다 — 둘을 따로 그리면 칸이 늘 때 한쪽을 빠뜨린다 */
  const menu = (
    <div className="flex flex-col gap-3">
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col gap-px">
          {g.title && <p className="px-2.5 pb-1 text-[11px] font-bold tracking-[0.1em] text-dim-2">{g.title}</p>}
          {g.items.map(render)}
        </div>
      ))}
    </div>
  );

  const backLink = (
    <Link href={ROUTES.home} className="press tap flex items-center rounded-lg px-2.5 text-[12.5px] text-dim transition-colors hover:text-ink">
      {ADMIN_NAV.backToSite}
    </Link>
  );

  /** 띠에 세운 넷 중 어디에도 없는 화면(게임 고치기 등)에서는 더보기가 켜진 칸이다 */
  const onTab = TABS.some((t) => isActive(pathname, t.href));
  const tabClass = "press flex min-h-[var(--touch-target)] flex-1 flex-col items-center justify-center gap-1 py-1.5";

  return (
    <>
      {/* 넓은 화면 — 왼쪽 끝에 붙은 접히는 기둥(admin-rail) */}
      <AdminRail counts={counts} initialCollapsed={initialCollapsed} initialOpened={initialOpened} onSoon={setSoon} />

      {/*
        좁은 화면 — 바닥 띠. 화면 바닥에 **못 박는다**(fixed).
        sticky 로 뒀더니 본문이 끝나는 자리에서 띠가 같이 올라가 버려 푸터가 띠 아래로 나왔고,
        스켈레톤처럼 본문이 짧은 순간에는 띠가 화면 한가운데에 떴다(2026-09-22 사용자 지적).
        모바일 앱의 띠는 내용과 함께 흐르지 않는다 — 늘 같은 자리에 있어야 손이 기억한다.

        띠가 푸터를 덮지 않게 **문서 바닥에 띠 높이만큼 자리를 비우는 일은 globals.css 가 한다**
        (`body:has([data-admin-tabbar])`). 푸터는 이 컴포넌트 바깥, 루트 레이아웃에 있어서
        여기서는 닿지 않는다.
      */}
      <nav
        data-admin-tabbar
        aria-label={ADMIN_NAV.menuTitle}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {TABS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass}>
              <TabBody item={item} active={active} counts={counts} />
            </Link>
          );
        })}
        <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen} className={tabClass}>
          <span
            className={cn(
              "flex h-7 w-[46px] items-center justify-center rounded-full transition-colors duration-base",
              !onTab ? "bg-acc-soft text-acc" : "text-dim",
            )}
          >
            <MenuIcon size={19} />
          </span>
          <span className={cn("text-[10.5px] leading-none", !onTab ? "font-bold text-acc" : "text-dim")}>{ADMIN_NAV.more}</span>
        </button>
      </nav>

      {/* 고른 칸으로 가면 주소가 바뀌고, 시트는 그때 스스로 닫힌다(ui/sheet 의 경로 감시) */}
      <Sheet title={ADMIN_NAV.menuTitle} open={menuOpen} onOpenChange={setMenuOpen}>
        <nav aria-label={ADMIN_NAV.menuTitle} className="flex flex-col gap-4 pb-1 pt-2">
          {menu}
          <div className="border-t border-line pt-2">{backLink}</div>
        </nav>
      </Sheet>

      {/* 판은 메뉴 바깥에 하나만 둔다 — 칸마다 두면 안 열린 판이 일곱 개 떠 있게 된다 */}
      <ComingSoon
        title={soon?.label ?? ""}
        lead={soon?.soon?.lead ?? ""}
        body={soon?.soon?.body ?? ""}
        open={soon !== null}
        onOpenChange={(v) => !v && setSoon(null)}
      />
    </>
  );
}
