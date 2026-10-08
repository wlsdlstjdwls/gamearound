// 관리자 화면 뼈대 부품 — 여러 관리자 loading.tsx 가 같이 쓰는 모양만 모았다.
//
// 표(DataHead/DataRow), 검수 줄(왼쪽 글 + 오른쪽 320px 판정 칸), 머리(제목 + 설명 한 줄), 칩 줄이
// 매칭, 상품, 회사, 실행 로그, 게임 수정, 특전, 인디에 되풀이된다. 화면마다 손으로 그리면
// 줄 높이와 칸 틀이 실물과 따로 놀게 된다 — 그래서 실물 부품(data-rows)의 껍데기 클래스를 그대로 따라 쓴다.
// 칸 틀 문자열은 lib/admin/table-cols 에서 화면과 같은 값을 받는다.
import { Bone, PageHeadSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { ROWS } from "@/components/ui/page";

/**
 * 관리자 화면 머리 — PageHead 아래 13px 설명 문단(lead)이 거의 모든 화면에 붙는다.
 * leadLines: 설명이 넓은 화면에서 몇 줄로 접히는지. 매칭, 상품처럼 안내가 긴 화면은 두 줄이다(2026-10-08 캡처 비교)
 */
export function AdminHeadSkeleton({
  width = "w-40",
  lead = true,
  leadLines = 1,
  action,
}: {
  width?: string;
  lead?: boolean;
  leadLines?: number;
  action?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <PageHeadSkeleton width={width} action={action} />
      {lead &&
        Array.from({ length: leadLines }).map((_, i) => (
          <Bone key={i} className={cn("h-4 max-w-full", i === leadLines - 1 ? "w-[460px]" : "w-[600px]")} />
        ))}
    </div>
  );
}

/** 마디 제목(17px 굵은 h2) 자리 */
export function AdminH2Skeleton({ width = "w-28" }: { width?: string }) {
  return <Bone className={cn("h-6", width)} />;
}

/**
 * 칩 줄. ChipLink 의 md 는 30px, sm 은 26px 높이다(ui/chip 의 py 와 글자 크기).
 * ChipsSkeleton(36px)은 서비스 화면의 큰 칩이라 여기 쓰면 줄이 6px 씩 튄다.
 */
const ADMIN_CHIP_WIDTHS = ["w-12", "w-16", "w-[72px]", "w-14", "w-20", "w-[60px]"];

export function AdminChipsSkeleton({ count, size = "md" }: { count: number; size?: "sm" | "md" }) {
  return (
    <div className={cn("flex flex-wrap", size === "sm" ? "gap-1" : "gap-1.5")}>
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} className={cn("rounded-full", size === "sm" ? "h-[26px]" : "h-[30px]", ADMIN_CHIP_WIDTHS[i % ADMIN_CHIP_WIDTHS.length])} />
      ))}
    </div>
  );
}

/**
 * 표 뼈대 — DataHead + DataList 와 같은 껍데기.
 * cells: 칸마다 값 막대의 높이, 폭, 모양 클래스(예: "h-4 w-3/4"). 판정 버튼 칸은 버튼 모양("h-8 w-[120px] rounded-[9px]")을 넘긴다.
 * 높이를 기본값과 합치지 않는 이유: cn 은 겹치는 클래스를 지우지 않아 h-4 와 h-8 이 같이 붙으면 어느 쪽이 이길지 CSS 순서가 정한다.
 * 좁은 화면에서는 실물처럼 줄이 카드로 눕고 칸마다 88px 이름표가 왼쪽에 선다.
 * mobileSummary: 실행 로그처럼 좁은 화면에서 칸을 숨기고 요약 두 줄만 세우는 표.
 */
export function DataTableSkeleton({
  cols,
  cells,
  rows,
  mobileSummary = false,
}: {
  cols: string;
  /** 칸마다 막대 클래스. 배열을 주면 그 칸에 막대를 세로로 쌓는다(매칭의 "맞아요", "아니에요" 단추 둘) */
  cells: Array<string | string[]>;
  rows: number;
  mobileSummary?: boolean;
}) {
  return (
    <div aria-hidden>
      <div className={cn("hidden border-b border-line md:grid", cols)}>
        {cells.map((_, i) => (
          <Bone key={i} className="h-3 w-12" />
        ))}
      </div>
      <div className="divide-y divide-line-soft">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={cn("flex flex-col gap-2 py-3.5 md:grid md:items-center md:gap-y-0", cols)}>
            {/* 좁은 화면 요약 카드 — 실행 로그 실물(MobileRunHead + 이름표 줄 둘)을 따른다: 소스 이름과 결과 배지,
                시각과 건수 한 줄, 이름표/값 두 줄. 두 줄만 그렸더니 줄 하나가 63 대 160px 로 어긋났다(2026-10-08 캡처) */}
            {mobileSummary && (
              <div className="flex flex-col gap-2 py-1 md:hidden">
                <div className="flex items-center justify-between gap-3">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-[22px] w-14 rounded-full" />
                </div>
                <Bone className="h-3.5 w-52" />
                {[0, 1].map((j) => (
                  <div key={j} className="mt-1 flex gap-3">
                    <Bone className="h-3.5 w-14 shrink-0" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Bone className="h-3.5 w-24" />
                      <Bone className="h-3.5 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cells.map((cell, i) => (
              <div key={i} className={cn(mobileSummary ? "hidden" : "flex", "min-w-0 items-center gap-2.5 md:block")}>
                <Bone className="h-3 w-[88px] shrink-0 md:hidden" />
                {Array.isArray(cell) ? (
                  <div className="flex flex-col items-start gap-2">
                    {cell.map((c, j) => (
                      <Bone key={j} className={c} />
                    ))}
                  </div>
                ) : (
                  <Bone className={cell} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 검수 줄 — 특전, 인디 관리 화면. 왼쪽은 제목(15px)과 꼬리 한두 줄, 오른쪽 320px 은 입력 칸(36px)과 버튼 줄이다.
 * 실물의 li 클래스(grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6)를 그대로 따른다.
 */
export function ModerationRowsSkeleton({ rows, metaLines = 1 }: { rows: number; metaLines?: number }) {
  return (
    <div className={ROWS} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Bone className={cn("h-5", i % 2 ? "w-1/2" : "w-2/3")} />
            {Array.from({ length: metaLines }).map((_, j) => (
              <Bone key={j} className={cn("h-3.5", j === 0 ? "w-56" : "w-32")} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Bone className="h-9 w-full rounded-lg" />
            <div className="flex gap-1.5">
              <Bone className="h-8 w-16 rounded-[9px]" />
              <Bone className="h-8 w-16 rounded-[9px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
