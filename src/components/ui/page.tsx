// 페이지 셸 — 리디자인 스펙의 최대폭, 좌우 28px 패딩을 한 곳에서 관리한다.
// 폭: 기본 1120 / 알림 860 / 설정 720. 상단 패딩은 화면 성격별로 22~32px, 하단은 80~90px.
import { cn } from "@/lib/cn";

export type PageWidth = "default" | "narrow" | "tight";
export type PagePad = "home" | "detail" | "sub";

const WIDTH: Record<PageWidth, string> = {
  default: "max-w-[var(--page-w)]",
  narrow: "max-w-[var(--page-w-narrow)]",
  tight: "max-w-[var(--page-w-tight)]",
};

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
      className={cn(enter && "page-enter", "mx-auto flex w-full flex-col px-7", WIDTH[width], PAD[pad], className)}
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
      {action}
    </div>
  );
}
