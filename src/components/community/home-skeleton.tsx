// 게시판 홈(S-10), 라운지 홈(S-16) 뼈대 — 두 홈이 같은 소식 블록(news-blocks)과 게시판 고르기 판(board-picker)을 쓰니 뼈대도 한 벌이다.
// 순서: 머리(제목, 설명, 오른쪽 단추) | (라운지만) 현황 띠 | 게시판 고르기 카드 | 왼쪽 급상승 넷 + 기다리는 글 여섯, 오른쪽 패널 | 각주.
// 게시판 고르기 카드는 2026-10-28 다시 그리는 중인 모양(높이 64 가로 카드, 그림 칸 + 이름과 글 수 + 최근 글 한 줄)에 맞춘다.
import { cn } from "@/lib/cn";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

/** 급상승, 기다리는 글의 줄 수 — 실물 RISING_LIMIT, WAITING_LIMIT 과 같다(lib/community/constants) */
const RISING_ROWS = 4;
const WAITING_ROWS = 6;
/** 오른쪽 패널 줄 수 — 홍보는 최대 다섯, 내 게임은 최대 넷이지만 비어 있는 사람도 많아 셋으로 그린다 */
const SIDE_ROWS = 3;
/** 라운지 현황 띠 칸 수(등록 게임, 검토 중, 내 글 반응) */
const STAT_CELLS = 3;

const NEWS_BOX = "overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair";
const TITLE_WIDTHS = ["w-3/5", "w-1/2", "w-2/3", "w-2/5"];

/** 블록 머리(NewsHead) — 제목, 한 줄 설명, 오른쪽 링크 */
function NewsHeadSkeleton({ title, note = true, link = false }: { title: string; note?: boolean; link?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Bone className={cn("h-[22px]", title)} />
      {note && <Bone className="hidden h-4 w-40 sm:block" />}
      {link && <Bone className="ml-auto h-4 w-20" />}
    </div>
  );
}

/** 소식 줄 셋째 줄까지(딱지 줄, 제목, 작성자) */
function PostLines({ i }: { i: number }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Bone className="h-3.5 w-36" />
      <Bone className={cn("h-[22px]", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
      <Bone className="h-4 w-24" />
    </div>
  );
}

function StatStripSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair md:flex-row md:items-stretch">
      <div className="grid min-w-0 flex-1 grid-cols-3">
        {Array.from({ length: STAT_CELLS }).map((_, i) => (
          <div key={i} className={cn("flex min-w-0 flex-col gap-2.5 border-line-soft px-4 py-4 sm:flex-row sm:items-center sm:gap-3.5 sm:px-5", i > 0 && "border-l")}>
            <Bone className="size-9 shrink-0 rounded-xl sm:size-11" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bone className="h-3.5 w-16 max-w-full" />
              <Bone className="h-7 w-12" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex min-h-[var(--touch-target)] items-center justify-center border-t border-line-soft px-5 md:w-36 md:border-l md:border-t-0">
        <Bone className="h-4 w-20" />
      </div>
    </div>
  );
}

/** 게시판 고르기 — 머리 줄(이름 + 오늘 글 수, 오른쪽 "전체 글 보기") + 높이 64 가로 카드 */
function BoardPickerSkeleton({ boards }: { boards: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Bone className="h-[25px] w-44" />
        <Bone className="h-4 w-20" />
      </div>
      <div className={cn("grid gap-3", boards === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {Array.from({ length: boards }).map((_, i) => (
          <div key={i} className="flex h-16 items-center gap-3 rounded-[var(--radius-panel)] bg-surface px-4 shadow-[var(--elev-card)]">
            <Bone className="size-10 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bone className="h-4 w-24" />
              <Bone className="h-3.5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * boards: 고르기 카드 수(게시판 셋, 라운지 둘). stats: 라운지의 현황 띠. side: 오른쪽 패널 폭 클래스(게시판 360, 라운지 380).
 * actions: 머리 오른쪽 단추 수(게시판은 글쓰기 하나, 라운지는 내 게임 관리 + 글 작성)
 */
export function CommunityHomeSkeleton({ boards, stats = false, side, actions }: { boards: number; stats?: boolean; side: string; actions: number }) {
  return (
    <SkeletonPage gap={24}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <Bone className="h-[30px] w-36 sm:h-[37px]" />
          <div className="flex gap-2">
            {Array.from({ length: actions }).map((_, i) => (
              <Bone key={i} className="h-10 w-24 rounded-xl" />
            ))}
          </div>
        </div>
        <Bone className="h-4 w-[420px] max-w-full" />
      </div>

      {stats && <StatStripSkeleton />}
      <BoardPickerSkeleton boards={boards} />

      <div className={cn("grid items-start gap-6", side)}>
        <div className="flex min-w-0 flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <NewsHeadSkeleton title="w-24" link />
            <div className={cn(NEWS_BOX, "divide-y divide-line-soft")}>
              {Array.from({ length: RISING_ROWS }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <Bone className="size-[30px] shrink-0 rounded-lg" />
                  <PostLines i={i} />
                  <div className="hidden flex-col items-end gap-1 sm:flex">
                    <Bone className="h-4 w-10" />
                    <Bone className="h-4 w-14" />
                    <Bone className="h-4 w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <NewsHeadSkeleton title="w-36" />
            <div className={cn(NEWS_BOX, "divide-y divide-line-soft")}>
              {Array.from({ length: WAITING_ROWS }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                  <PostLines i={i + 1} />
                  <Bone className="h-9 w-24 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <NewsHeadSkeleton title="w-32" note={false} link />
          <div className={cn(NEWS_BOX, "flex flex-col gap-2.5 p-3.5")}>
            {Array.from({ length: SIDE_ROWS }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[var(--radius-inset)] bg-surface-4 p-3">
                <Bone className="size-12 shrink-0 rounded-[10px] sm:size-[52px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Bone className="h-[18px] w-3/4" />
                  <Bone className="h-3.5 w-1/2" />
                </div>
                <Bone className="h-6 w-14 shrink-0 rounded-full" />
              </div>
            ))}
            <div className="mt-1 flex flex-col gap-2 border-t border-line-soft px-1.5 pb-1 pt-4">
              <Bone className="h-5 w-28" />
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-4/5" />
              <Bone className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>
      <Bone className="h-3.5 w-72 max-w-full" />
    </SkeletonPage>
  );
}
