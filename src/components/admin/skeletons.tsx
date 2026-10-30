// 관리자 화면 뼈대 부품 — 여러 관리자 loading.tsx 가 같이 쓰는 모양만 모았다.
//
// 머리(제목), 칩 줄, 검수 줄(왼쪽 글 + 오른쪽 판정 칸), 조회조건 + 그리드 + 상세 판이 여러 화면에 되풀이된다.
// 화면마다 손으로 그리면 줄 높이와 칸 틀이 실물과 따로 놀게 된다 — 그래서 실물 부품의 껍데기 클래스를 그대로 따라 쓴다.
// 옛 표 부품(data-rows)과 그 뼈대(DataTableSkeleton)는 마지막 화면(게임 고치기)이 그리드로 옮겨 2026-10-30 지웠다.
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { ROWS } from "@/components/ui/page";

/**
 * 관리자 화면 머리 — 21px 제목(PageHead size="admin") 아래 설명 한 줄(AdminLead).
 * 설명은 2026-10-30 에 화면에서 걷었다(사용자 "쓸데없는 문구"). lead, leadLines 는 부르는 쪽 호환으로만 받는다
 */
export function AdminHeadSkeleton({
  width = "w-40",
  lead = false,
  action,
}: {
  width?: string;
  lead?: boolean;
  leadLines?: number;
  action?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Bone className={cn("h-[25px]", width)} />
        {lead && <Bone className="h-3.5 w-[460px] max-w-full" />}
      </div>
      {action && <Bone className={cn("h-9 rounded-[9px]", action)} />}
    </div>
  );
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

/** 조회조건 띠 + 왼쪽 그리드(아래 일괄 처리 띠) + 오른쪽 상세 판 — 승인 화면(components/admin/screen/approval)의 뼈대 */
export function MasterDetailSkeleton({ listWidth = "560px", rows = 10 }: { listWidth?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Bone className="h-[54px] w-full rounded-xl" />
      <div className="grid items-start gap-4 lg:grid-cols-[var(--master-w)_minmax(0,1fr)]" style={{ "--master-w": listWidth } as React.CSSProperties}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col overflow-hidden rounded-xl border border-line">
            <Bone className="h-9 w-full rounded-none" />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex h-10 items-center gap-3 border-t border-line px-3">
                <Bone className="h-3.5 w-6" />
                <Bone className={cn("h-3.5", i % 2 ? "w-2/5" : "w-1/2")} />
                <Bone className="ml-auto h-3.5 w-16" />
              </div>
            ))}
          </div>
          <Bone className="h-[52px] w-full rounded-xl" />
        </div>
        <Bone className="h-[360px] w-full rounded-xl" />
      </div>
    </div>
  );
}
