// 스켈레톤 조각 — 화면별 loading.tsx 가 실물과 같은 모양을 쌓는 데 쓰는 낱개 부품.
//
// 왜 뽑았나(2026-10-08, 사용자: "다 똑같아.. 그 화면의 컨텐츠마다 크기도 다르고 모양도 다른데"):
// loading.tsx 가 루트, 관리자, 상세 셋뿐이라 회사, 뉴스, 세일, 설정 같은 화면이 전부 홈 모양 카드 격자를
// 빌려 썼다. 표가 올 자리에 카드가, 글 목록이 올 자리에 커버가 떴다. 화면마다 제 모양을 세우되
// 막대 하나, 제목 한 줄 같은 낱개는 여기서 같이 쓴다 — 그래야 막대 둥글기와 제목 높이가 화면마다 어긋나지 않는다.
//
// 화면 단위의 덩어리(카드 격자, 표)는 여기 두지 않는다. 그건 실물 컴포넌트의 상수(CARD_SHELL, 격자 클래스)를
// 가져와야 맞는데, ui 프리미티브가 게임 카드를 알면 계층이 거꾸로 선다. 게임 카드 뼈대는 components/game-card-skeleton.
import { Page, type PageProps } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { LOADING_MESSAGES } from "@/lib/messages";

/** 둥글기 클래스를 넘겼는지 — 반응형 접두(sm:rounded-xl)까지 본다 */
const OWN_RADIUS = /(^|\s|:)rounded(-|\s|$)/;

/**
 * 막대 하나. 크기와 모양은 부르는 쪽이 실물을 재서 넘긴다 — 기본값이 있으면 화면마다 같은 막대가 다시 퍼진다.
 * 둥글기를 넘기면 기본(rounded)을 뺀다. cn 은 겹친 클래스를 지우지 않아 둘 다 붙으면 어느 쪽이 이길지를
 * CSS 출력 순서가 정한다 — 둥근 칩 뼈대가 네모로 나올 수 있다.
 */
export function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ownRadius = className !== undefined && OWN_RADIUS.test(className);
  return <div aria-hidden className={cn("skeleton", !ownRadius && "rounded", className)} style={style} />;
}

/**
 * 스켈레톤 화면 셸 — 실물과 같은 Page 를 쓰되 등장 페이드를 끄고(enter=false) 느릴 때만 떠오른다(skeleton-delay).
 * 곧바로 그리면 응답이 빠른 화면에서 한두 프레임만 번쩍이고 사라져 그게 깜빡임이 된다.
 */
export function SkeletonPage({ className, children, ...rest }: Omit<PageProps, "enter">) {
  return (
    <Page enter={false} className={cn("skeleton-delay", className)} aria-busy="true" {...rest}>
      <span className="sr-only">{LOADING_MESSAGES.label}</span>
      {children}
    </Page>
  );
}

/**
 * 관리자 본문용 셸 — 관리자 레이아웃이 이미 흰 판과 간격(gap 22)을 깔아 두었으니 Page 를 또 두르지 않는다.
 * 판 안에 Page 를 넣으면 좌우 여백이 한 겹 더 붙어 본문이 안쪽으로 밀린다.
 */
export function SkeletonBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("skeleton-delay flex flex-col gap-[22px]", className)} aria-busy="true">
      <span className="sr-only">{LOADING_MESSAGES.label}</span>
      {children}
    </div>
  );
}

/**
 * 화면 제목(PageHead) 자리. 높이는 실물 글자 줄 높이다 — page 26/32px x 1.15, hero 30/40px x 1.1.
 * desc 는 제목 아래 설명 문단 줄 수(실물 PageHead 의 children).
 */
export function PageHeadSkeleton({
  size = "page",
  width = "w-48",
  desc = 0,
  action,
}: {
  size?: "page" | "hero";
  width?: string;
  desc?: number;
  /** 오른쪽 끝 단추 자리의 폭 클래스 */
  action?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-4">
        <Bone className={cn(size === "hero" ? "h-[33px] sm:h-[43px]" : "h-[30px] sm:h-[37px]", width, "max-w-full")} />
        {action && <Bone className={cn("h-9 rounded-[9px]", action)} />}
      </div>
      {Array.from({ length: desc }).map((_, i) => (
        <Bone key={i} className={cn("h-4 max-w-full", i === desc - 1 ? "w-[260px]" : "w-[420px]")} />
      ))}
    </div>
  );
}

/** 마디 제목(SectionHead) 자리 — section 21/25px, sub 17/18px 글자의 줄 높이 */
export function SectionHeadSkeleton({
  size = "section",
  width = "w-36",
  action = false,
}: {
  size?: "section" | "sub";
  width?: string;
  /** 오른쪽 "전체 보기" 링크 자리 */
  action?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Bone className={cn(size === "section" ? "h-[26px] sm:h-[30px]" : "h-[22px] sm:h-6", width)} />
      {action && <Bone className="h-4 w-14" />}
    </div>
  );
}

/** 칩 한 줄(정렬, 갈래, 기간 칩). 높이 31 은 ui/chip 의 md(py-1.5 + 12.5px 글자 줄) 실측이다 — 폭을 하나씩 달리 줘서 낱말 길이가 다른 실물처럼 보이게 한다 */
const CHIP_WIDTHS = ["w-14", "w-[72px]", "w-16", "w-20", "w-[60px]", "w-[88px]"];

export function ChipsSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} className={cn("h-[31px] rounded-full", CHIP_WIDTHS[i % CHIP_WIDTHS.length])} />
      ))}
    </div>
  );
}

/**
 * 헤어라인 목록(.rows) 자리 — 줄 하나의 모양은 부르는 쪽이 그린다(뉴스 줄, 표 행, 알림 줄이 다 다르다).
 * 줄 사이 선은 실물과 같은 .rows 가 긋는다.
 */
export function RowsSkeleton({
  rows,
  className,
  renderRow,
}: {
  rows: number;
  className?: string;
  renderRow: (i: number) => React.ReactNode;
}) {
  return (
    <div className={cn("rows", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>{renderRow(i)}</div>
      ))}
    </div>
  );
}

/** 문단 줄 — 마지막 줄만 짧게 끊는다(실물 문단의 끝줄이 그렇다) */
export function TextLinesSkeleton({ lines, className }: { lines: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}
