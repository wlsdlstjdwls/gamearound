// 페이지 셸 — 리디자인 스펙의 최대폭, 좌우 패딩을 한 곳에서 관리한다.
// 폭: 기본 1200 / 좁은 화면 720(설정, 입점처럼 입력이 주인공인 곳) / 넓은 화면 1440(관리자 셸).
// 상단 패딩은 22~32px, 하단은 80~90px.
//
// 860 짜리 한 칸(narrow)을 지웠다(2026-09-21): 알림 하나만 그 폭을 쓰고 있었는데, 목록과 위시리스트를
// 오가다 알림에 들어오면 본문이 혼자 좁아져 화면이 한 번 흔들렸다. 폭이 다르면 다른 이유가 있어야 한다.
import { cn } from "@/lib/cn";

export type PageWidth = "default" | "tight" | "wide";
export type PagePad = "home" | "detail" | "sub" | "admin";

const WIDTH: Record<PageWidth, string> = {
  default: "max-w-[var(--page-w)]",
  tight: "max-w-[var(--page-w-tight)]",
  // 관리자 셸 전용(2026-09-22). 서비스 화면에 쓰지 않는다 — 근거는 globals.css 의 --page-w-wide
  wide: "max-w-[var(--page-w-wide)]",
};

/*
 * 좌우 여백은 머리띠(site-header)와 같은 값이어야 한다 — 거기는 좁은 화면에서 px-5 다.
 * 본문만 px-7 로 두었더니 로고와 본문 첫 글자의 시작점이 8px 어긋나 화면이 한 칸 밀려 보였고,
 * 320px 기기에서는 그 8px 두 벌이 카드 폭에서 그대로 빠졌다.
 */
/*
 * 아래 여백은 푸터와의 거리다(푸터는 제 위 여백을 갖지 않는다 — site-footer 주석).
 * 상세를 80 에서 40 으로 줄였다(2026-09-22, 사용자 지적): 상세의 마지막 마디는 뉴스 목록이라
 * 줄이 끝난 자리가 곧 본문의 끝인데, 그 아래 80px 이 비면 "더 있는데 안 나온" 것처럼 보였다.
 * 홈과 서브는 그대로 둔다 — 홈은 마지막 줄이 카드 격자라 여백이 그 격자의 그림자 자리이고,
 * 서브(설정, 약관)는 마지막 줄이 버튼인 화면이 많아 손가락이 푸터 링크를 잘못 누른다.
 */
const PAD: Record<PagePad, string> = {
  home: "pt-8 pb-[90px]",
  detail: "pt-6 pb-10",
  sub: "pt-[22px] pb-20",
  /*
   * 관리자 셸. 좁은 화면에서만 아래 여백을 줄인다(2026-09-22, "컨텐츠와 푸터 사이 공백이 너무 크다").
   * 거기서는 이 여백 밑에 바닥 띠 자리 56px 이 한 겹 더 깔려서(globals.css 의 body:has) 80 + 56 = 136px 이
   * 내용과 푸터 사이에 남았다. 넓은 화면은 띠가 없으니 서브 화면과 같은 값을 그대로 쓴다.
   */
  admin: "pt-[22px] pb-6 md:pb-20",
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
 * 내용 덩어리 — 테두리도 배경도 없다.
 *
 * 왜 비었나(2026-09-21 리디자인): 예전에는 1px 테두리 + 흰 판이었다. 그 판이 화면마다 서너 겹으로
 * 겹치면서(판 안의 판 안의 목록) 실제로 봐야 할 값보다 상자 선이 더 많아졌다. 리디자인은 구분을
 * 헤어라인 한 줄(.rows)에만 맡기고 내용은 배경 위에 그대로 올린다.
 *
 * 함수를 지우지 않는 이유: 부르는 자리가 30곳이 넘고, 그 자리들이 "여기가 한 덩어리" 라는 뜻을
 * 계속 들고 있어야 한다. 언젠가 판이 다시 필요해지면 여기 한 곳만 고치면 된다.
 * 진짜 면이 필요한 자리(로그인 상자, 인셋 안내)는 Panel 을 쓴다.
 */
export function cardClass(className?: string): string {
  return cn(className);
}

export function Card({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div className={cardClass(className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * 채운 면 — 테두리가 아니라 배경 한 겹으로 "여기는 따로 읽는 곳" 을 말한다.
 * 리디자인이 판을 남겨 둔 자리는 둘뿐이다: 입력 묶음(로그인 상자)과 인셋 안내문.
 * 그래서 색은 --surface-2 고정이고 1px 테두리는 쓰지 않는다 — 면과 선을 같이 쓰면 판이 다시 두꺼워진다.
 * 대신 헤어라인 링(--ring-hair)을 그림자로 한 줄 두른다(2026-09-22). 배경이 3% 어두워지면서
 * 면 대 면의 경계가 번졌고, 그 자리를 선으로 메우면 레이아웃이 1px 씩 밀린다 — 그림자는 안 밀린다.
 */
export function panelClass(className?: string): string {
  return cn("rounded-[var(--radius-panel)] bg-surface-2 shadow-hair", className);
}

/**
 * 마디 카드 — 회색 바탕 위에 흰 판 한 겹(2026-09-30, 상세 화면을 커머스 정보형으로).
 * Panel(회청 면)과 다른 점: 이건 "위에 얹힌 한 덩어리" 이고 Panel 은 "판 안의 움푹한 칸" 이다.
 * .card-panel(목록 카드)을 쓰지 않는 이유 — 그건 hover 에서 떠오른다. 마디는 누르는 것이 아니다.
 * 판 안에 또 판을 넣지 않는다 — 안쪽 구분은 헤어라인(.rows)과 Panel 이 맡는다.
 */
export function sectionCardClass(className?: string): string {
  return cn("rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)] sm:p-6", className);
}

export function Panel({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div className={panelClass(className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * 헤어라인 목록 — ul/dl 에 붙여 항목 사이를 1px 선으로만 가른다(globals.css 의 .rows).
 * divide-y 를 쓰지 않는 이유: 그건 항목 **사이**만 긋고 목록의 머리를 긋지 않는다.
 * 판이 없어진 화면에서는 그 첫 줄이 제목과 목록을 잇는 유일한 표시다.
 */
export const ROWS = "rows";

/** 헤어라인 줄 하나 — 좌우로 6px 넘겨 hover 면이 글자보다 살짝 넓게 깔린다 */
export const ROW = "row-hover -mx-1.5 rounded-lg px-1.5";

/**
 * 화면 제목 행 — 한 화면에 하나뿐인 h1 자리.
 *
 * 뽑아낸 이유: `text-2xl font-bold tracking-[-0.03em] text-ink` 가 13곳에 그대로 복제돼 있었고,
 * 그러는 동안 상세 28px, 회사 26px, 검색 결과 20px 로 슬금슬금 어긋났다. 크기는 두 단만 둔다 —
 * 목록, 설정처럼 제목이 표지 노릇만 하는 화면은 page, 제목 자체가 내용인 화면(상세, 회사)은 hero.
 * note 는 제목 옆 회색 보조 문구, action 은 오른쪽 끝 링크 자리다(SectionHead 와 같은 배치 규칙).
 */
export type PageTitleSize = "page" | "hero";

/* 리디자인 스펙: 표지형 32px, 제목 자체가 내용인 화면 40px. 둘 다 -0.045em 으로 바짝 조인다 —
   800 무게의 한글 제목은 자간을 조이지 않으면 큰 크기에서 글자가 흩어져 보인다 */
const TITLE_SIZE: Record<PageTitleSize, string> = {
  page: "text-[26px] leading-[1.15] tracking-[-0.045em] sm:text-[32px]",
  hero: "text-[30px] leading-[1.1] tracking-[-0.045em] sm:text-[40px] sm:leading-[1.08]",
};

export function PageHead({
  title,
  note,
  action,
  size = "page",
  hideTitle = false,
  className,
  style,
  children,
}: {
  title: React.ReactNode;
  note?: React.ReactNode;
  action?: React.ReactNode;
  size?: PageTitleSize;
  /**
   * 제목을 화면에서만 감춘다(목록, 출시예정). 지우지 않고 감추는 이유는 h1 이 문서의 뼈대라서다 —
   * 없애면 낭독기 사용자가 "여기가 어느 화면인가" 를 물을 자리를 잃고, 검색 로봇도 같은 것을 읽는다.
   * 머리띠가 지금 보고 있는 메뉴를 보라색으로 말해 주므로 눈으로 읽는 제목은 같은 말을 두 번 한다.
   */
  hideTitle?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  // 제목만 있고 감춘 화면은 껍데기를 세우지 않는다 — 빈 div 하나가 페이지 간격(gap)을 한 칸 더 먹는다.
  // sr-only 는 absolute 라 flex 칸을 차지하지 않는다(그래서 이 한 줄만 남기면 간격이 안 생긴다)
  if (hideTitle && !note && !action && !children) return <h1 className="sr-only">{title}</h1>;

  return (
    // children(설명 문단)은 제목 줄 **아래** 줄에 통째로 눕는다.
    // 같은 flex 행에 두면 제목과 오른쪽 버튼 사이에 문단이 끼어 셋이 한 줄로 읽혔다(2026-09-21).
    <div className={cn("flex flex-col gap-2.5", className)} style={style}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className={hideTitle ? "sr-only" : cn("font-extrabold text-ink", TITLE_SIZE[size])}>{title}</h1>
          {note && <span className="text-[13.5px] text-mut">{note}</span>}
        </div>
        {/* justify-between 은 한 줄일 때만 오른쪽 끝을 만든다. 좁은 화면에서 줄이 갈리면
            혼자 남은 이 조각이 왼쪽에 붙어 제목 아래 들여쓴 것처럼 보였다 — ml-auto 가 두 경우를 같게 만든다 */}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/** 섹션 제목 크기 — 판이 사라진 화면에서 섹션을 가르는 건 여백과 이 크기차뿐이다.
 *  section 22px: 화면의 큰 마디(플랫폼별 가격, 추가 콘텐츠, 최근 출시)
 *  sub 18px: 한 화면 안에서 또 갈리는 작은 마디(설정의 계정, 알림, 테마)
 *  label 12px 대문자 자간: 값 묶음의 이름표(필터 기둥의 플랫폼, 정보 출처) — 제목이라기보다 꼬리표다 */
export type SectionSize = "section" | "sub" | "label";

/* Collapsible 이 같은 사다리를 써야 해서 내보낸다 — 접히는 마디와 안 접히는 마디의 제목 크기가
   다르면 같은 화면에서 마디의 격이 달라 보인다 */
export const SECTION_SIZE: Record<SectionSize, string> = {
  section: "text-[19px] font-extrabold tracking-[-0.04em] text-ink sm:text-[22px]",
  sub: "text-[17px] font-extrabold tracking-[-0.035em] text-ink sm:text-[18px]",
  label: "text-[12px] font-bold tracking-[0.08em] text-dim",
};

/** 섹션 제목 행 — 제목 + 우측 보조 문구/링크.
 *  className, style 을 받는 이유: 목록이 항목별로 등장하는 영역에서는 제목도 등장 순번(.enter-item + stagger)을 가져야 한다
 *  as 를 받는 이유: 별도 머리글 없이 섹션으로 시작하는 화면(홈)은 첫 섹션 제목이 그 문서의 h1 이어야 한다.
 *  크기(size)와 문서 구조(as)는 따로 정한다 — h1 이라고 커야 하는 것도, h3 이라고 작아야 하는 것도 아니다 */
export function SectionHead({
  id,
  title,
  note,
  action,
  size = "section",
  className,
  style,
  as: Heading = "h2",
}: {
  id?: string;
  title: React.ReactNode;
  note?: React.ReactNode;
  action?: React.ReactNode;
  size?: SectionSize;
  className?: string;
  style?: React.CSSProperties;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", className)} style={style}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Heading id={id} className={SECTION_SIZE[size]}>
          {title}
        </Heading>
        {note && <span className="text-[13px] text-dim">{note}</span>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
