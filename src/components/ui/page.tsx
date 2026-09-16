// 페이지 셸 — 리디자인 스펙의 최대폭, 좌우 패딩을 한 곳에서 관리한다.
// 폭: 기본 1120 / 알림 860 / 설정 720. 상단 패딩은 화면 성격별로 22~32px, 하단은 80~90px.
import { cn } from "@/lib/cn";

export type PageWidth = "default" | "narrow" | "tight";
export type PagePad = "home" | "detail" | "sub";

const WIDTH: Record<PageWidth, string> = {
  default: "max-w-[var(--page-w)]",
  narrow: "max-w-[var(--page-w-narrow)]",
  tight: "max-w-[var(--page-w-tight)]",
};

/*
 * 좌우 여백은 머리띠(site-header)와 같은 값이어야 한다 — 거기는 좁은 화면에서 px-5 다.
 * 본문만 px-7 로 두었더니 로고와 본문 첫 글자의 시작점이 8px 어긋나 화면이 한 칸 밀려 보였고,
 * 320px 기기에서는 그 8px 두 벌이 카드 폭에서 그대로 빠졌다.
 */
const PAD: Record<PagePad, string> = {
  home: "pt-8 pb-[90px]",
  detail: "pt-6 pb-20",
  sub: "pt-[22px] pb-20",
};

export type PageProps = React.ComponentProps<"div"> & {
  width?: PageWidth;
  pad?: PagePad;
  /** 섹션 간 간격(px). 홈 36 / 상세 28 / 서브 20 */
  gap?: number;
  /** 등장 페이드. 스켈레톤(loading.tsx)은 false — 스켈레톤까지 페이드하면 본문 교체 때 같은 자리가 두 번 켜져 깜빡인다 */
  enter?: boolean;
};

export function Page({ width = "default", pad = "sub", gap, enter = true, className, style, children, ...rest }: PageProps) {
  return (
    <div
      className={cn(enter && "page-enter", "mx-auto flex w-full flex-col px-5 sm:px-7", WIDTH[width], PAD[pad], className)}
      style={gap === undefined ? style : { ...style, gap: `${gap}px` }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * 카드 표면 — 1px 테두리 + 흰 배경 + 12px 라운드. 그림자는 쓰지 않는다(리디자인 원칙: 깊이는 테두리로만).
 * div 가 아닌 요소(section, form, dl, li, nav)도 같은 표면을 쓰므로 클래스 함수로 내보낸다.
 */
export function cardClass(className?: string): string {
  return cn("rounded-xl border border-line bg-surface", className);
}

export function Card({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div className={cardClass(className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * 화면 제목 행 — 한 화면에 하나뿐인 h1 자리.
 *
 * 뽑아낸 이유: `text-2xl font-bold tracking-[-0.03em] text-ink` 가 13곳에 그대로 복제돼 있었고,
 * 그러는 동안 상세 28px, 회사 26px, 검색 결과 20px 로 슬금슬금 어긋났다. 크기는 두 단만 둔다 —
 * 목록, 설정처럼 제목이 표지 노릇만 하는 화면은 page, 제목 자체가 내용인 화면(상세, 회사)은 hero.
 * note 는 제목 옆 회색 보조 문구, action 은 오른쪽 끝 링크 자리다(SectionHead 와 같은 배치 규칙).
 */
export type PageTitleSize = "page" | "hero";

const TITLE_SIZE: Record<PageTitleSize, string> = {
  page: "text-2xl tracking-[-0.03em]",
  hero: "text-[28px] leading-[1.2] tracking-[-0.03em]",
};

export function PageHead({
  title,
  note,
  action,
  size = "page",
  className,
  style,
  children,
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
  action?: React.ReactNode;
  size?: PageTitleSize;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2", className)} style={style}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className={cn("font-bold text-ink", TITLE_SIZE[size])}>{title}</h1>
        {note && <span className="text-[13px] text-dim">{note}</span>}
      </div>
      {/* justify-between 은 한 줄일 때만 오른쪽 끝을 만든다. 좁은 화면에서 줄이 갈리면
          혼자 남은 이 조각이 왼쪽에 붙어 제목 아래 들여쓴 것처럼 보였다 — ml-auto 가 두 경우를 같게 만든다 */}
      {action && <div className="ml-auto">{action}</div>}
      {children}
    </div>
  );
}

/** 섹션 제목 행 — 17px/700 + 우측 보조 문구/링크.
 *  className, style 을 받는 이유: 목록이 항목별로 등장하는 영역에서는 제목도 등장 순번(.enter-item + stagger)을 가져야 한다
 *  as 를 받는 이유: 별도 머리글 없이 섹션으로 시작하는 화면(홈)은 첫 섹션 제목이 그 문서의 h1 이어야 한다.
 *  크기는 그대로 둔다 — 문서 구조와 글자 크기는 별개다 */
export function SectionHead({
  id,
  title,
  note,
  action,
  className,
  style,
  as: Heading = "h2",
}: {
  id?: string;
  title: string;
  note?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", className)} style={style}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Heading id={id} className="text-[17px] font-bold tracking-[-0.02em] text-ink">
          {title}
        </Heading>
        {note && <span className="text-[12.5px] text-dim">{note}</span>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
