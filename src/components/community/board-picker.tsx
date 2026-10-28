// 게시판 고르기 판 — 게임 게시판 홈(리뷰, 공략, 홍보)과 라운지 홈(개발일지, 질문/피드백)이 같이 쓴다.
//
// 2026-10-28 하위 띠에서 갈래 칸을 걷고 처음엔 현황 띠(StatStrip)의 숫자 칸에 링크를 걸었다. 사용자: "이동 가능한지 전혀 모르겠고,
// 화면 전체가 파래서 눈에도 안 띈다". 숫자 칸은 "현황" 으로 읽혀 길로 보이지 않았고, 파랑 그림 칸이 화면 곳곳의 파랑에 묻혔다.
// 그래서 길은 길처럼 생긴 카드로 따로 세운다: 게시판 이름이 제목이고, 무엇을 하는 곳인지 한 줄, 맨 아래 "OO 보러 가기".
// 쉬는 모양은 무채색(흰 판, 회색 그림 칸, 먹색 글자)이고 파랑은 hover 때만 든다 — 파랑이 "누를 수 있는 자리" 하나만 말하게.
// 오늘 올라온 글 수는 칸이 아니라 머리 줄의 덧말로 내렸다 — 누를 수 없는 숫자를 누를 수 있는 칸 옆에 같은 모양으로 두지 않는다.
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { BOARD_PAGE_COPY, COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { CATEGORY_LABEL, CATEGORY_LIST_PATH } from "@/lib/community/constants";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import type { PostCategory } from "@/server/db/schema";

export function BoardPicker({
  categories,
  counts,
  today,
  icons,
  allHref,
}: {
  categories: readonly PostCategory[];
  counts: Partial<Record<PostCategory, number>>;
  today: number;
  icons: Partial<Record<PostCategory, React.ReactNode>>;
  allHref: string;
}) {
  return (
    <section aria-labelledby="board-picker-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="board-picker-heading" className="flex items-baseline gap-2 text-[18px] font-extrabold tracking-[-0.03em] text-ink">
          {M.pickerTitle}
          <span className="text-[13px] font-medium tracking-normal text-dim">{M.pickerToday(today)}</span>
        </h2>
        <Link href={allHref} className="tap inline-flex items-center gap-0.5 text-[13.5px] font-semibold text-mut hover:text-ink">
          {M.allPostsLink}
          <ChevronLeftIcon size={14} aria-hidden className="rotate-180" />
        </Link>
      </div>
      <ul className={cn("grid gap-3", categories.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {categories.map((c, i) => {
          const label = CATEGORY_LABEL[c];
          return (
            <li key={c} className="enter-item" style={stagger(i)}>
              <Link
                href={CATEGORY_LIST_PATH[c]}
                className="press lift group/pick flex h-full flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)] transition-shadow duration-base hover:shadow-[var(--elev-card-hover)]"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2 transition-colors duration-base group-hover/pick:bg-acc group-hover/pick:text-on-ink"
                  >
                    {icons[c]}
                  </span>
                  <span className="min-w-0 flex-1 text-[17px] font-extrabold tracking-[-0.03em] text-ink">{label}</span>
                  <span className="shrink-0 text-[13px] tabular-nums text-dim">{M.postCount(counts[c] ?? 0)}</span>
                </div>
                <p className="text-[13.5px] leading-[1.55] text-mut">{BOARD_PAGE_COPY[c].lead}</p>
                <span className="mt-auto flex items-center gap-1 border-t border-line-soft pt-3 text-[14px] font-bold text-ink-2 transition-colors duration-base group-hover/pick:text-acc">
                  {M.pickerGo(label)}
                  <ChevronLeftIcon size={15} aria-hidden className="rotate-180 transition-transform duration-base group-hover/pick:translate-x-1" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
