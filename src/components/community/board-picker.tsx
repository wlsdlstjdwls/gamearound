// 게시판 고르기 판 — 게임 게시판 홈(리뷰, 공략, 홍보)과 라운지 홈(개발일지, 질문/피드백)이 같이 쓴다.
//
// 2026-10-28 하위 띠에서 갈래 칸을 걷고 처음엔 현황 띠(StatStrip)의 숫자 칸에 링크를 걸었다. 사용자: "이동 가능한지 전혀 모르겠고,
// 화면 전체가 파래서 눈에도 안 띈다". 그래서 길처럼 생긴 카드(이름, 한 줄 설명, "OO 보러 가기")로 세웠더니, 같은 날 다시
// "전보다 낫지만 밋밋해서 누르고 싶지 않고, 영역도 너무 크다". 설명 문단과 아래 단추 줄이 카드 키를 두 배로 키우면서
// 정작 "들어가면 뭐가 있나" 는 말하지 않았다.
// 지금 모양: 납작한 가로 카드 한 줄. 갈래마다 제 색 그림 칸(리뷰 파랑, 공략 초록, 홍보와 질문 보라, 개발일지 청록)이 서서 칸끼리 갈리고,
// 설명 대신 그 게시판의 가장 새 글 제목 한 줄이 "지금 무슨 얘기가 오가나" 를 보여 준다. 오늘 올라온 글이 있으면 제 색 딱지가 선다.
// 오른쪽 동그라미 꺾쇠는 늘 선다 — 터치 기기에는 hover 가 없어 그것 말고는 눌린다는 표시가 없다.
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { CATEGORY_LABEL, CATEGORY_LIST_PATH } from "@/lib/community/constants";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import type { PostCategory } from "@/server/db/schema";
import type { BoardHomeDto } from "@/server/services/community";

/**
 * 갈래 색. 노랑, 호박은 쓰지 않는다(2026-10-27 사용자 "누런색 금지"). 한 화면에 함께 서는 갈래끼리는 색이 겹치지 않는다
 * (게시판: 파랑, 초록, 보라 | 라운지: 청록, 보라). soft 는 쉬는 그림 칸, solid 는 hover 때 채운 그림 칸과 오늘 딱지다
 */
const TONE: Record<PostCategory, { soft: string; solid: string; wash: string }> = {
  review: { soft: "bg-acc-soft text-acc", solid: "group-hover/pick:bg-acc group-hover/pick:text-on-ink", wash: "before:from-acc-soft" },
  guide: { soft: "bg-ok-soft text-ok", solid: "group-hover/pick:bg-ok group-hover/pick:text-on-ink", wash: "before:from-ok-soft" },
  promo: { soft: "bg-plum-soft text-plum", solid: "group-hover/pick:bg-plum group-hover/pick:text-on-ink", wash: "before:from-plum-soft" },
  devlog: { soft: "bg-info-soft text-info", solid: "group-hover/pick:bg-info group-hover/pick:text-on-ink", wash: "before:from-info-soft" },
  qna: { soft: "bg-plum-soft text-plum", solid: "group-hover/pick:bg-plum group-hover/pick:text-on-ink", wash: "before:from-plum-soft" },
};

export function BoardPicker({
  categories,
  home,
  icons,
  allHref,
}: {
  categories: readonly PostCategory[];
  home: Pick<BoardHomeDto, "counts" | "todayCounts" | "latest" | "today">;
  icons: Partial<Record<PostCategory, React.ReactNode>>;
  allHref: string;
}) {
  return (
    <section aria-labelledby="board-picker-heading" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="board-picker-heading" className="flex items-baseline gap-2 text-[16px] font-extrabold tracking-[-0.03em] text-ink">
          {M.pickerTitle}
          <span className="text-[12.5px] font-medium tracking-normal text-dim">{M.pickerToday(home.today)}</span>
        </h2>
        <Link href={allHref} className="tap inline-flex items-center gap-0.5 text-[13px] font-semibold text-mut hover:text-ink">
          {M.allPostsLink}
          <ChevronLeftIcon size={14} aria-hidden className="rotate-180" />
        </Link>
      </div>
      <ul className={cn("grid grid-cols-[minmax(0,1fr)] gap-2.5", categories.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2")}>
        {categories.map((c, i) => {
          const label = CATEGORY_LABEL[c];
          const tone = TONE[c];
          const today = home.todayCounts[c] ?? 0;
          const latest = home.latest[c];
          return (
            <li key={c} className="enter-item min-w-0" style={stagger(i)}>
              <Link
                href={CATEGORY_LIST_PATH[c]}
                aria-label={M.pickerGo(label)}
                className={cn(
                  "press lift group/pick relative flex h-full items-center gap-3 overflow-hidden rounded-[var(--radius-md)] bg-surface py-3 pl-3 pr-3.5 shadow-[var(--elev-card)]",
                  "transition-shadow duration-base hover:shadow-[var(--elev-card-hover)]",
                  // 그림 칸 쪽에서 번지는 갈래 색 — 바탕이라 글자 대비는 흰 판 그대로다. hover 때 조금 더 번진다
                  "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:bg-gradient-to-r before:to-transparent before:opacity-60 before:transition-opacity before:duration-base hover:before:opacity-100",
                  tone.wash,
                )}
              >
                <span aria-hidden className={cn("relative grid size-11 shrink-0 place-items-center rounded-xl transition-[background-color,color,scale] duration-base group-hover/pick:scale-105", tone.soft, tone.solid)}>
                  {icons[c]}
                </span>
                <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15.5px] font-extrabold tracking-[-0.02em] text-ink">{label}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-dim">{M.postCount(home.counts[c] ?? 0)}</span>
                    {today > 0 && <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums", tone.soft)}>{M.pickerTodayBadge(today)}</span>}
                  </span>
                  <span className="truncate text-[13px] text-mut">{latest ? latest.title : M.pickerNoPosts}</span>
                </span>
                <span
                  aria-hidden
                  className="relative grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-mut transition-[background-color,color,translate] duration-fast group-hover/pick:translate-x-0.5 group-hover/pick:bg-ink group-hover/pick:text-on-ink"
                >
                  <ChevronLeftIcon size={15} className="rotate-180" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
