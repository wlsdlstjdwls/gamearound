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
// 매장과 할 일은 각자 혼자 서는 자리다.
//
// **낱말은 ADMIN_NAV 한곳에서만 정한다.** 메뉴에서 본 말과 들어간 화면의 제목이 다르면
// 같은 곳인지 의심하게 된다.
//
// 고른 칸은 **브랜드 보라 면**이다. 앞서 쓰던 --surface-3 은 메뉴가 얹힌 --surface-2 와 한 단
// 차이라 훑어서는 어느 칸이 켜져 있는지 보이지 않았다. 칩과 같은 짝(bg-acc + text-on-ink)이다.
//
// **좁은 화면은 왜 바닥 띠인가**(2026-09-22, "상단 메뉴가 보기 불편하다" → "모바일앱처럼 하단에"):
// 앞 판은 칸 일곱을 머리 위에서 가로로 미는 한 줄에 늘어놓았다. 화면에 들어오는 건 둘 반이고
// 미끄러진다는 표시가 없어서 나머지가 있다는 사실 자체가 안 보였다. 세 번째 칸은 늘 글자가 잘린 채
// 서 있었고, 지금 보는 화면이 오른쪽 끝이면 그 표시(보라 면)조차 화면 밖이었다.
// 바닥은 손가락이 이미 가 있는 자리라 칸이 다섯이면 미는 일 없이 전부 닿는다.
//
// **다섯 칸에 일곱을 어떻게 넣나**: 넣지 않는다. 자주 가는 넷을 세우고 마지막 칸은 더보기다.
// 더보기는 기둥과 **똑같은 메뉴**를 시트로 펴므로 일곱 전부와 서비스 화면으로 가는 길이 거기 있다.
// 넷을 고른 기준은 "거기서 할 일이 있는가" 다 — 실행 로그는 읽기만 하는 자리고(수집 현황에서도 간다),
// 아직 열지 않은 칸 둘은 눌러도 사유만 말한다.
//
// 남은 일 수는 **약속(Promise)으로 받아 배지 자리에서만 기다린다.** 회사 검수 수를 뽑는 질의가
// games 전수 훑기(실측 27ms, 왕복까지 두 번)라서, 그 값을 메뉴가 기다리면 관리자가 누르는
// 모든 화면이 그만큼 늦게 뜬다. 메뉴는 먼저 그리고 숫자만 나중에 앉힌다.
import { Suspense, use, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/sheet";
import { MenuIcon } from "@/components/ui/icons";
import { ADMIN_NAV, ADMIN_SOON } from "@/lib/admin/messages";
import { COMING_SOON } from "@/lib/messages/coming-soon";
import { ROUTES } from "@/lib/routes";
import { BoxIcon, BuildingIcon, CheckListIcon, LinkIcon, LogIcon, PulseIcon, StoreIcon } from "@/components/admin/nav-icons";
import { ComingSoon } from "@/components/ui/coming-soon";

export interface AdminNavCounts {
  matches: number;
  products: number;
  shops: number;
  companies: number;
  companiesCapped: boolean;
  tasksTodo: number;
  tasksDoing: number;
}

type Pick = { n: number; capped?: boolean };

/**
 * 배지 한 개. `tone` 은 뜻이다 — "남음" 은 쌓인 일(채운 보라), "진행" 은 이미 손댄 일(브랜드 보라).
 * 할 일 칸만 둘을 단다(할 일 칸 건수, 하는 중 칸 건수). 한 숫자로 합치면 "시작도 안 한 일" 과
 * "하다 만 일" 이 섞여 어느 쪽이 밀렸는지 못 읽는다.
 */
type BadgeSpec = { pick: (c: AdminNavCounts) => Pick; tone?: "pending" | "doing" };

type Item = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  /** 이 칸에 남은 일 수를 뽑는 함수. 없으면 배지를 달지 않는다(읽기 전용 화면) */
  pick?: (c: AdminNavCounts) => Pick;
  /** 둘째 배지. 넓은 화면 기둥에만 선다 — 바닥 띠의 그림 귀퉁이에는 하나만 들어간다 */
  pick2?: BadgeSpec;
  /**
   * 아직 열지 않은 칸. 주면 링크가 아니라 사유를 말하는 판을 여는 버튼이 된다.
   * 화면은 그대로 살아 있어 주소로는 열린다 — 막는 건 이 한 줄뿐이다.
   */
  soon?: { lead: string; body: string };
};

/** 묶음 제목이 없는 묶음은 칸 하나짜리다 — 제목이 곧 칸 이름이라 두 번 적지 않는다 */
const GROUPS: Array<{ key: string; title?: string; items: Item[] }> = [
  {
    key: "sync",
    title: ADMIN_NAV.groupSync,
    items: [
      { href: ROUTES.admin, label: ADMIN_NAV.overview, Icon: PulseIcon },
      { href: ROUTES.adminSyncLogs, label: ADMIN_NAV.logs, Icon: LogIcon },
    ],
  },
  {
    key: "review",
    title: ADMIN_NAV.groupReview,
    items: [
      { href: ROUTES.adminMatches, label: ADMIN_NAV.matches, Icon: LinkIcon, pick: (c) => ({ n: c.matches }) },
      {
        href: ROUTES.adminCompanies,
        label: ADMIN_NAV.companies,
        Icon: BuildingIcon,
        pick: (c) => ({ n: c.companies, capped: c.companiesCapped }),
      },
      { href: ROUTES.adminProducts, label: ADMIN_NAV.products, Icon: BoxIcon, soon: ADMIN_SOON.products },
    ],
  },
  {
    key: "etc",
    title: ADMIN_NAV.groupEtc,
    items: [
      { href: ROUTES.shopsAdmin, label: ADMIN_NAV.shops, Icon: StoreIcon, soon: ADMIN_SOON.shops },
      {
        href: ROUTES.adminTasks,
        label: ADMIN_NAV.tasks,
        Icon: CheckListIcon,
        pick: (c) => ({ n: c.tasksTodo }),
        pick2: { pick: (c) => ({ n: c.tasksDoing }), tone: "doing" },
      },
    ],
  },
];

const ITEMS = GROUPS.flatMap((g) => g.items);

/**
 * 지금 화면인지. 대시보드(`/admin`)만 정확히 일치로 본다 —
 * 접두사로 보면 하위 화면이 전부 대시보드로 표시돼 표시가 의미를 잃는다.
 */
function isActive(pathname: string, href: string): boolean {
  return href === ROUTES.admin ? pathname === href : pathname.startsWith(href);
}

function Badge({
  counts,
  pick,
  tone = "pending",
  active,
  className,
}: {
  counts: Promise<AdminNavCounts | null>;
  pick: (c: AdminNavCounts) => Pick;
  tone?: BadgeSpec["tone"];
  active: boolean;
  className?: string;
}) {
  const c = use(counts);
  if (!c) return null;
  const { n, capped } = pick(c);
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[11.5px] font-semibold tabular-nums",
        // 고른 칸은 이미 보라 면이다 — 그 위에 주황 배지를 얹으면 색이 둘 다 소리친다.
        // 같은 면 안에서 한 겹 밝은 자리로만 말한다
        // 남음은 브랜드 보라를 채워 칠한다(2026-10-02, 사용자: "배지 색이 너무 구리다"). 호박(warn)은 "데이터 지연"
        // 경고색이라 메뉴가 탁한 갈색 얼룩으로 보였고, 무채 회색으로 바꾸자 "흐리다" 했다 — 건수는 눈에 걸려야 한다.
        // 진행은 옅은 보라로 둬 같은 칸의 두 배지가 채움과 옅음으로 갈린다
        active ? "bg-on-ink/20 text-on-ink" : tone === "doing" ? "bg-acc-soft text-acc" : "bg-acc text-on-ink",
        className,
      )}
    >
      {n}
      {capped ? "+" : ""}
      {/* 숫자만 있으면 남은 일인지 처리한 일인지 모른다 — 읽는 기계에는 뜻을 붙여 준다 */}
      <span className="sr-only"> {tone === "doing" ? ADMIN_NAV.badgeDoingSuffix : ADMIN_NAV.badgeSuffix}</span>
    </span>
  );
}

/** 칸 하나의 속. 링크든 버튼이든 안은 같아야 한다 — 다르면 둘 중 하나가 슬금슬금 어긋난다 */
function ItemBody({
  item,
  active,
  counts,
  iconSize,
  badgeClassName,
}: {
  item: Item;
  active: boolean;
  counts: Promise<AdminNavCounts | null>;
  iconSize: number;
  badgeClassName?: string;
}) {
  const { Icon } = item;
  return (
    <>
      <Icon size={iconSize} />
      {item.label}
      {item.pick && (
        // 숫자가 늦어도 메뉴는 이미 눌리는 상태여야 한다 — 그래서 배지만 따로 기다린다
        <Suspense fallback={null}>
          <Badge counts={counts} pick={item.pick} active={active} className={badgeClassName} />
        </Suspense>
      )}
      {item.pick2 && (
        // 첫 배지가 ml-auto 로 오른쪽 끝에 붙고 둘째는 그 곁에 선다. 첫 배지가 0 이라 안 그려지면
        // 둘째가 첫 span 이 되어 ml-auto 를 그대로 쥔다
        <Suspense fallback={null}>
          <Badge
            counts={counts}
            pick={item.pick2.pick}
            tone={item.pick2.tone}
            active={active}
            className={cn(badgeClassName, "[&:not(:first-of-type)]:ml-0")}
          />
        </Suspense>
      )}
      {/* 아직 열지 않은 칸은 그렇게 보여야 한다 — 눌러 보고 알게 하면 매번 같은 실망을 한다 */}
      {item.soon && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10.5px] font-semibold",
            badgeClassName,
            active ? "bg-on-ink/20 text-on-ink" : "bg-surface-3 text-dim",
          )}
        >
          {COMING_SOON.badge}
        </span>
      )}
    </>
  );
}

/**
 * 바닥 띠에 세울 칸. **GROUPS 에서 골라 온다** — 여기서 이름과 그림을 다시 적으면
 * 기둥과 띠가 다른 말을 하기 시작한다(주소만 적고 나머지는 원본에서 끌어온다).
 */
const TAB_HREFS: readonly string[] = [ROUTES.admin, ROUTES.adminMatches, ROUTES.adminCompanies, ROUTES.adminTasks];
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
  user,
  counts,
  className,
}: {
  user: string;
  counts: Promise<AdminNavCounts | null>;
  /** 넓은 화면 기둥의 면. 레이아웃이 본문 판과 같은 흰 판을 준다 — 바닥 띠에는 붙지 않는다 */
  className?: string;
}) {
  const pathname = usePathname();
  /** 지금 사유를 말하고 있는 칸. 한 번에 하나만 뜬다 */
  const [soon, setSoon] = useState<Item | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /** 링크와 버튼이 같은 모양이어야 한다. 아직 열지 않은 칸만 버튼이고 나머지는 전부 링크다 */
  const itemClass = (active: boolean) =>
    cn(
      "press flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-3 text-[14px] transition-colors",
      active ? "bg-acc font-semibold text-on-ink" : "font-medium text-mut hover:bg-surface-2 hover:text-ink",
    );

  const render = (item: Item) => {
    const active = isActive(pathname, item.href);
    const body = <ItemBody item={item} active={active} counts={counts} iconSize={18} badgeClassName="ml-auto" />;
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
    <div className="flex flex-col gap-4">
      {GROUPS.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          {g.title && <p className="px-3 pb-1 text-[11px] font-bold tracking-[0.1em] text-dim-2">{g.title}</p>}
          {g.items.map(render)}
        </div>
      ))}
    </div>
  );

  const backLink = (
    <Link href={ROUTES.home} className="press tap flex items-center rounded-lg px-3 text-[12.5px] text-dim transition-colors hover:text-ink">
      {ADMIN_NAV.backToSite}
    </Link>
  );

  /** 띠에 세운 넷 중 어디에도 없는 화면(게임 고치기 등)에서는 더보기가 켜진 칸이다 */
  const onTab = TABS.some((t) => isActive(pathname, t.href));
  const tabClass = "press flex min-h-[var(--touch-target)] flex-1 flex-col items-center justify-center gap-1 py-1.5";

  return (
    <>
      {/* 넓은 화면 — 왼쪽 기둥. 본문이 길어도 메뉴는 따라온다 */}
      <aside className={cn("sticky top-[84px] hidden w-[212px] shrink-0 flex-col gap-5 md:flex", className)}>
        <div className="px-3">
          <p className="text-[15px] font-bold tracking-[-0.02em] text-ink">{ADMIN_NAV.consoleTitle}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-dim">{user}</p>
        </div>

        <nav aria-label={ADMIN_NAV.menuTitle} className="flex flex-col gap-4">
          {menu}
        </nav>

        {backLink}
      </aside>

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
