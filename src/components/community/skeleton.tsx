// 게시판 화면 뼈대 — 목록(post-board), 글 상세(post-detail), 글쓰기(post-form)의 loading.tsx 가 같이 쓴다.
//
// 게시판 목록은 리뷰, 공략, 홍보, 전체 글, 라운지 셋이 한 틀(post-board)을 쓰니 뼈대도 한 벌이다. 화면마다 따로 그리면
// 틀이 바뀔 때 일곱 곳 중 몇 곳만 따라가 "이 게시판만 뼈대가 다르다" 가 생긴다. 다른 점(왼쪽 메뉴 칸 수, 홍보 유형 칩)만 값으로 받는다.
// 줄 높이는 실물 클래스를 그대로 옮겼다 — 목록 줄 min-h 44 + py-3, 상세 판 p-5/sm:p-8, 칸 46.
import { cn } from "@/lib/cn";
import { FieldSkeleton, SegmentedSkeleton, TextareaSkeleton } from "@/components/ui/form-skeleton";
import { Bone, PageHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";

/** 제목 막대 폭 — 줄마다 달라야 목록처럼 보인다(같은 폭이면 표로 읽힌다) */
const TITLE_WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-[45%]", "w-2/3", "w-[38%]"];

/** 목록 첫 화면 줄 수 — 한 쪽은 20줄(POSTS_PAGE_SIZE)이지만 첫 화면에 보이는 만큼만 세운다 */
const BOARD_SKELETON_ROWS = 10;

/** 글 목록 줄(post-list 의 bare). 왼쪽 말머리와 제목, 오른쪽 작성자, 날짜, 조회, 좋아요 — 좁은 화면은 오른쪽 값이 아래 줄로 내려간다 */
export function PostRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="-mx-1 divide-y divide-line-soft">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex min-h-[var(--touch-target)] flex-col gap-1 px-1 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Bone className="h-5 w-10 shrink-0 rounded-[5px]" />
            <Bone className={cn("h-5", TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
          </div>
          <Bone className="h-4 w-52 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * 게시판 목록 한 벌(post-board) — 머리(제목, 설명, 글쓰기 단추), 왼쪽 보조 메뉴 판, 오른쪽 흰 판(판 이름 + 검색, 탭 줄, 목록), 맨 아래 각주.
 * menu: 보조 메뉴 칸 수(전체 글 + 카테고리 수). promoTabs: 홍보 게시판의 유형 칩(전체 + PROMO_TYPES) 자리
 */
export function PostBoardSkeleton({ menu, promoTabs = 0 }: { menu: number; promoTabs?: number }) {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-28" desc={1} action="w-28" />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-5">
        <div className="min-w-0 rounded-[var(--radius-md)] bg-surface p-2 shadow-hair">
          <Bone className="mx-3 mb-1.5 mt-2 hidden h-3.5 w-12 lg:block" />
          <div className="flex gap-1 overflow-hidden lg:flex-col">
            {Array.from({ length: menu }).map((_, i) => (
              <Bone key={i} className="h-10 w-24 shrink-0 rounded-lg lg:w-full" />
            ))}
          </div>
          {/* 맨 아래 "게시판 이용 안내" 줄 */}
          <Bone className="mt-1 hidden h-10 w-full rounded-lg lg:block" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Bone className="h-5 w-40" />
              <div className="flex items-center gap-1.5">
                <Bone className="h-10 w-[92px] shrink-0 rounded-xl" />
                <Bone className="h-10 min-w-0 flex-1 rounded-xl md:w-[240px] md:flex-none" />
                <Bone className="h-10 w-[60px] shrink-0 rounded-xl" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft pb-3">
              <div className="flex gap-1.5">
                <Bone className="h-[31px] w-14 rounded-full" />
                <Bone className="h-[31px] w-14 rounded-full" />
              </div>
              {promoTabs > 0 && (
                <div className="flex gap-1.5 sm:ml-auto">
                  {Array.from({ length: promoTabs }).map((_, i) => (
                    <Bone key={i} className="h-[31px] w-16 rounded-full" />
                  ))}
                </div>
              )}
            </div>
          </div>
          <PostRowsSkeleton rows={BOARD_SKELETON_ROWS} />
        </div>
      </div>
      <Bone className="h-3.5 w-72 max-w-full" />
    </SkeletonPage>
  );
}

/** 본문 문단 줄 수 — 짧은 글도 이 정도는 된다. 길게 그리면 짧은 글이 올 때 화면이 크게 줄어든다 */
const DETAIL_BODY_LINES = 7;
/** 댓글 자리 줄 수 — 글마다 0개부터 수십 개라 한두 개로 그린다 */
const DETAIL_COMMENTS = 2;

/**
 * 글 상세(post-detail) — 좁은 폭, 글 판(말머리, 제목, 작성자 줄 | 본문 | 좋아요, 저장 알약), 댓글 판(제목, 댓글 줄, 입력 칸),
 * 이전/다음 글과 목록으로 줄. 관련 게임 카드는 글마다 있다 없다 해서 그리지 않는다.
 * backLink: 라운지 글은 맨 위에 "목록으로" 링크가 선다(게시판 글은 공용 경로 줄이 대신한다)
 */
export function PostDetailSkeleton({ backLink = false }: { backLink?: boolean }) {
  return (
    <SkeletonPage width="tight" gap={22}>
      {backLink && <Bone className="-mb-3 -mt-[14px] h-5 w-20" />}
      <div className="flex flex-col gap-6 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-8">
        <div className="flex flex-col gap-3 border-b border-line-soft pb-5">
          <Bone className="h-5 w-12 rounded-[5px]" />
          <Bone className="h-[30px] w-4/5 sm:h-[35px]" />
          <Bone className="h-4 w-64 max-w-full" />
        </div>
        <TextLinesSkeleton lines={DETAIL_BODY_LINES} />
        <div className="flex justify-center gap-2">
          <Bone className="h-11 w-24 rounded-full" />
          <Bone className="h-11 w-24 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-8">
        <Bone className="h-6 w-16" />
        <div className="flex flex-col divide-y divide-line-soft">
          {Array.from({ length: DETAIL_COMMENTS }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 py-3.5">
              <Bone className="h-4 w-28" />
              <Bone className={cn("h-5", i === 0 ? "w-4/5" : "w-1/2")} />
            </div>
          ))}
        </div>
        {/* 댓글 입력 칸(rows 3)과 등록 단추 */}
        <div className="flex flex-col gap-2">
          <Bone className="h-[104px] w-full rounded-xl" />
          <Bone className="ml-auto h-10 w-20 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
        {[0, 1].map((i) => (
          <div key={i} className="flex min-h-[var(--touch-target)] items-center gap-3 px-4">
            <Bone className="h-3.5 w-10" />
            <Bone className="h-4 w-1/2" />
          </div>
        ))}
        <div className="flex min-h-[var(--touch-target)] items-center justify-center">
          <Bone className="h-4 w-24" />
        </div>
      </div>
    </SkeletonPage>
  );
}

/**
 * 글쓰기(post-form) — 좁은 폭, 제목, 판 둘(글의 성격 | 내용), 아래 붙는 등록 띠.
 * categories: 카테고리 세그먼트 칸 수. review: 처음 열리는 카테고리가 리뷰면(게시판 글쓰기 기본) 스포 세그먼트와 관련 게임 칸이 같이 선다
 */
export function PostFormSkeleton({ categories, review }: { categories: number; review: boolean }) {
  return (
    <SkeletonPage width="tight" gap={20}>
      <PageHeadSkeleton width="w-24" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-5 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-7">
          <Bone className="h-[22px] w-20" />
          <div className={cn("grid gap-5", review && "sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-8")}>
            <SegmentedSkeleton count={categories} />
            {review && <SegmentedSkeleton count={2} label="w-20" />}
          </div>
          {review && <FieldSkeleton label="w-20" />}
        </div>
        <div className="flex flex-col gap-5 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-7">
          <Bone className="h-[22px] w-12" />
          <FieldSkeleton label="w-10" />
          {/* 본문 에디터 — 도구 줄 + 최소 320 높이의 쓰는 칸 */}
          <TextareaSkeleton label="w-10" height="h-[366px]" />
          <div className="flex flex-col gap-2.5">
            <Bone className="h-[18px] w-48" />
            <Bone className="h-[54px] w-full rounded-[var(--radius-inset)] sm:w-1/2" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 rounded-[var(--radius-panel)] bg-surface p-3 shadow-[var(--elev-2)]">
          <Bone className="h-[46px] w-20 rounded-xl" />
          <Bone className="h-[46px] w-[140px] rounded-xl" />
        </div>
      </div>
    </SkeletonPage>
  );
}
