"use client";
// 관리자 메뉴 칸 정의와 칸 속(2026-10-29, admin-nav 가 300줄을 넘겨 뗐다). 기둥(admin-rail), 바닥 띠와 더보기 시트(admin-nav)가 같이 쓴다.
// 칸을 묶은 기준, 배지를 약속으로 받는 이유는 admin-nav 머리 주석에 있다.
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { COMING_SOON } from "@/lib/messages/coming-soon";
import { ROUTES } from "@/lib/routes";
import { BoardIcon, BoxIcon, BuildingIcon, CardIcon, ChatIcon, CheckListIcon, LinkIcon, LogIcon, MegaphoneIcon, PulseIcon, SearchCheckIcon, SparkleIcon, StoreIcon, UsersIcon } from "@/components/admin/nav-icons";
import { CalendarIcon, GamepadIcon, TagIcon, TicketIcon } from "@/components/ui/icons";
import { Suspense, use, type ComponentType } from "react";

export interface AdminNavCounts {
  matches: number;
  products: number;
  shops: number;
  companies: number;
  companiesCapped: boolean;
  tasksTodo: number;
  tasksDoing: number;
  indie: number;
  preorder: number;
  dataIssues: number;
}

export type Pick = { n: number; capped?: boolean };

/**
 * 배지 한 개. `tone` 은 뜻이다 — "남음" 은 쌓인 일(채운 파랑), "진행" 은 이미 손댄 일(브랜드 파랑).
 * 할 일 칸만 둘을 단다(할 일 칸 건수, 하는 중 칸 건수). 한 숫자로 합치면 "시작도 안 한 일" 과
 * "하다 만 일" 이 섞여 어느 쪽이 밀렸는지 못 읽는다.
 */
export type BadgeSpec = { pick: (c: AdminNavCounts) => Pick; tone?: "pending" | "doing" };

export type Item = {
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
   * 지금은 이 표시를 단 칸이 없다(2026-10-08 상품 매핑, 입점 신청을 열었다). 다시 닫을 자리라 틀은 남긴다.
   */
  soon?: { lead: string; body: string };
};

/**
 * 묶음 제목이 없는 묶음은 칸 하나짜리다 — 제목이 곧 칸 이름이라 두 번 적지 않는다.
 * 순서: 상품, 주문, 운영이 맨 위다(2026-10-29 사용자 "최상단으로"). 매일 여는 자리가 돈과 할 일이 됐고, 수집, 데이터는 배지가 부른다.
 * 묶음, 칸 이름은 ADMIN_NAV(백오피스식 업무 용어, 2026-10-29 밤 사용자가 고른 표)
 */
export const GROUPS: Array<{ key: string; title?: string; items: Item[] }> = [
  // 첫 화면 업무 현황판(2026-10-29). 묶음 머리 위 한 칸 — 어느 묶음에 일이 쌓였는지 여기서 보고 내려간다
  { key: "board", items: [{ href: ROUTES.admin, label: ADMIN_NAV.board, Icon: BoardIcon }] },
  {
    // 무엇을 얼마에 파나(상품등록), 언제 깎아 주나(프로모션등록), 산 것이 어디 서 있나(광고노출관리)
    key: "products",
    title: ADMIN_NAV.groupProducts,
    items: [
      { href: ROUTES.adminPricing, label: ADMIN_NAV.pricing, Icon: TagIcon },
      { href: ROUTES.adminDiscounts, label: ADMIN_NAV.discounts, Icon: TicketIcon },
      { href: ROUTES.adminPromotions, label: ADMIN_NAV.promotions, Icon: MegaphoneIcon },
    ],
  },
  {
    // 팔린 뒤 — 돈이 어떻게 오갔나(결제/환불관리), 누가 구독 중인가(멤버십회원관리)
    key: "orders",
    title: ADMIN_NAV.groupOrders,
    items: [
      { href: ROUTES.adminPayments, label: ADMIN_NAV.payments, Icon: CardIcon },
      { href: ROUTES.adminMemberships, label: ADMIN_NAV.memberships, Icon: UsersIcon },
    ],
  },
  {
    key: "ops",
    title: ADMIN_NAV.groupOps,
    items: [
      {
        href: ROUTES.adminTasks,
        label: ADMIN_NAV.tasks,
        Icon: CheckListIcon,
        pick: (c) => ({ n: c.tasksTodo }),
        pick2: { pick: (c) => ({ n: c.tasksDoing }), tone: "doing" },
      },
      // 그림이 같으면 기둥에서 두 칸이 같은 자리처럼 읽힌다(2026-10-29 광고 관리와 겹쳐 반짝임으로 바꿨다)
      { href: ROUTES.adminEffects, label: ADMIN_NAV.effects, Icon: SparkleIcon },
    ],
  },
  {
    key: "sync",
    title: ADMIN_NAV.groupSync,
    items: [
      { href: ROUTES.adminSync, label: ADMIN_NAV.overview, Icon: PulseIcon },
      { href: ROUTES.adminSyncLogs, label: ADMIN_NAV.logs, Icon: LogIcon },
    ],
  },
  {
    key: "review",
    title: ADMIN_NAV.groupReview,
    items: [
      { href: ROUTES.adminMatches, label: ADMIN_NAV.matches, Icon: LinkIcon, pick: (c) => ({ n: c.matches }) },
      { href: ROUTES.adminDataIssues, label: ADMIN_NAV.dataIssues, Icon: SearchCheckIcon, pick: (c) => ({ n: c.dataIssues }) },
      {
        href: ROUTES.adminCompanies,
        label: ADMIN_NAV.companies,
        Icon: BuildingIcon,
        pick: (c) => ({ n: c.companies, capped: c.companiesCapped }),
      },
      { href: ROUTES.adminPreorder, label: ADMIN_NAV.preorder, Icon: CalendarIcon, pick: (c) => ({ n: c.preorder }) },
    ],
  },
  {
    // 사람이 올린 것을 보는 자리(2026-10-26, 기획서 v2.0 2.2 운영진: 등록 승인, 노출 관리, 부적절한 글 숨김).
    // 게시글은 배지가 없다 — 신고 장치가 없어 쌓이는 큐가 아니라 훑어보는 목록이다(admin/posts 머리 주석)
    key: "community",
    title: ADMIN_NAV.groupCommunity,
    items: [
      { href: ROUTES.adminIndie, label: ADMIN_NAV.indie, Icon: GamepadIcon, pick: (c) => ({ n: c.indie }) },
      { href: ROUTES.adminPosts, label: ADMIN_NAV.posts, Icon: ChatIcon },
    ],
  },
  {
    // 입점 신청이 들어와야 상품 매핑이 생긴다 — 한 흐름이라 신청을 앞에 둔다
    key: "shops",
    title: ADMIN_NAV.groupShops,
    items: [
      { href: ROUTES.shopsAdmin, label: ADMIN_NAV.shops, Icon: StoreIcon, pick: (c) => ({ n: c.shops }) },
      { href: ROUTES.adminProducts, label: ADMIN_NAV.products, Icon: BoxIcon, pick: (c) => ({ n: c.products }) },
    ],
  },
];

export const ITEMS = GROUPS.flatMap((g) => g.items);

/**
 * 지금 화면인지. 대시보드(`/admin`)만 정확히 일치로 본다 —
 * 접두사로 보면 하위 화면이 전부 대시보드로 표시돼 표시가 의미를 잃는다.
 */
export function isActive(pathname: string, href: string): boolean {
  // 마디 경계로 자른다 — 맨 startsWith 면 /admin/sync 칸이 /admin/sync-logs 에서도 켜진다
  return href === ROUTES.admin ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function Badge({
  counts,
  pick,
  tone = "pending",
  active,
  dot,
  className,
}: {
  counts: Promise<AdminNavCounts | null>;
  pick: (c: AdminNavCounts) => Pick;
  tone?: BadgeSpec["tone"];
  active: boolean;
  /** 접힌 기둥의 점 배지. 64px 띠에서 "60+" 숫자 알약이 그림을 덮었다(2026-10-29 사용자 "접었을 때 겹친다") — 있다는 것만 점으로 말한다 */
  dot?: boolean;
  className?: string;
}) {
  const c = use(counts);
  if (!c) return null;
  const { n, capped } = pick(c);
  if (n <= 0) return null;
  if (dot) {
    return (
      <span className={cn("size-2 rounded-full ring-2 ring-surface", active ? "bg-on-ink" : "bg-acc", className)}>
        <span className="sr-only">
          {n}
          {capped ? "+" : ""} {ADMIN_NAV.badgeSuffix}
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[11.5px] font-semibold tabular-nums",
        // 고른 칸은 이미 파랑 면이다 — 그 위에 주황 배지를 얹으면 색이 둘 다 소리친다.
        // 같은 면 안에서 한 겹 밝은 자리로만 말한다
        // 남음은 브랜드 파랑를 채워 칠한다(2026-10-02, 사용자: "배지 색이 너무 구리다"). 호박(warn)은 "데이터 지연"
        // 경고색이라 메뉴가 탁한 갈색 얼룩으로 보였고, 무채 회색으로 바꾸자 "흐리다" 했다 — 건수는 눈에 걸려야 한다.
        // 진행은 옅은 파랑로 둬 같은 칸의 두 배지가 채움과 옅음으로 갈린다
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
export function ItemBody({
  item,
  active,
  counts,
  iconSize,
  badgeClassName,
  icon = true,
}: {
  item: Item;
  active: boolean;
  counts: Promise<AdminNavCounts | null>;
  iconSize: number;
  badgeClassName?: string;
  /** 하위 칸은 그림을 빼 상위 묶음과 갈린다(admin-rail). 접힌 기둥, 바닥 띠는 그림이 곧 칸이다 */
  icon?: boolean;
}) {
  const { Icon } = item;
  return (
    <>
      {icon && <Icon size={iconSize} />}
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

