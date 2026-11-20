// 명예의 전당 줄 모양들 — 4~10위 줄, 역대 TOP 10 줄(RankRow), 역대 선정작 카드(HistoryRow)와 그 둘이 쓰는 작은 부품.
// page.tsx 가 300줄을 넘어 줄 모양을 여기로 옮겼다(2026-11-20).
//
// 2026-11-20 사용자 "4~10위, 역대선정작 화면은 가독성이 너무 떨어짐":
// - 4~10위 줄은 왼쪽 칸에 순위, 점수(파랑), 변동(파랑)이 세로로 쌓여 폭을 먹고, 오른쪽에 보조 줄, "N위까지 n점"(파랑), 플랫폼 꼬리표가 몰려
//   파랑이 흩어지고 무엇이 먼저인지 없었다. 이제 한 줄 목록 꼴이다: 순위 숫자 | 작은 커버 | 제목과 회색 한 줄 | 오른쪽 끝 변동.
//   점수는 회색 줄의 맨 앞(굵게), "N위까지 n점" 은 그 아래 작은 회색 줄, 플랫폼은 좁은 화면에서 걷고 넓은 화면에서만 오른쪽 꼬리표로 선다.
// - 역대 선정작은 날짜가 "2026년 / 10월" 두 줄로 꺾이고 그림이 없어 게임이 안 들어왔다. 카드마다 커버를 두고, 머리 한 줄 "2026년 10월 1위",
//   제목, 개발자와 장르 줄로 세운다. 카드 전체가 그 달 순위표로 가는 링크라 줄마다 서던 "순위표 보기" 글자는 걷고 오른쪽에 꺾쇠 하나만 둔다.
// 파랑은 누르는 것(링크)에만 쓴다. 초록도 쓰지 않는다(오르면 잉크 굵은 글자, 내리면 흐린 글자).
import Link from "next/link";
import { FadeImage } from "@/components/ui/fade-image";
import { ChevronLeftIcon, SproutIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { FAME_MESSAGES as M, FAME_CARD_ATTR } from "@/lib/indie/fame";
import { genreLabels, INDIE_PLATFORM_LABEL } from "@/lib/indie/messages";
import type { RankedIndie } from "@/server/services/indie";

export function Cover({ item, sizes, className }: { item: RankedIndie; sizes: string; className?: string }) {
  return (
    <span className={cn("relative block aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-cover)] bg-surface-3", className)}>
      <FadeImage src={item.card.cover.url} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}

export const platformsOf = (item: RankedIndie) => item.card.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(", ");

const PLATFORM_PILL = "rounded-lg bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2";

/** "개발자 X | 장르" — 2, 3위 카드와 역대 카드의 보조 줄 */
export const devGenreOf = (item: RankedIndie) => [M.byDev(item.card.developerName), genreLabels(item.card.genres).join(", ")].filter(Boolean).join(" | ");

/**
 * 지난달 대비 한 마디. 오르면 잉크 굵은 글자, 내리면 흐린 글자, 지난달 점수가 없으면 "새로 진입".
 * 초록(--ok)과 파랑은 걷었다(2026-11-20, 초록 배지 금지, 파랑은 누르는 것의 색). 견줄 일이 없는 자리(역대)는 change 가 없어 아무것도 안 세운다
 */
export function ChangeNote({ change, className }: { change: number | null | undefined; className?: string }) {
  if (change === undefined) return null;
  const text = change === null ? M.newEntry : M.change(change);
  return <span className={cn("text-[12px] font-semibold tabular-nums", change === null || change > 0 ? "text-ink-2" : "text-dim", className)}>{text}</span>;
}

/** 내 게임일 때만 펴지는 글줄(새싹 + 문구). 딱지가 아니라 글자다 — 면을 얹으면 순위 딱지, 글과 겹쳤다(2026-10-30 사용자) */
/** onDark: 1위 큰 판(어두운 그림 위)에서는 파란 글자가 묻혀 흰 글자로 쓴다. 보라는 이 화면에서 걷었다(2026-11-18 사용자 "보라색은 다 빼줘") */
export function MineLine({ label, className, onDark = false }: { label: string; className?: string; onDark?: boolean }) {
  return (
    <span className={cn("fame-own items-center gap-1.5 font-bold", onDark ? "text-on-ink" : "text-acc", className)}>
      <SproutIcon size={14} />
      {label}
    </span>
  );
}

/** 줄 끝 꺾쇠 — 카드 전체가 링크임을 말한다. 화살표 글자 대신 그림이다(AGENTS 4장) */
const Chevron = () => <ChevronLeftIcon size={16} className="shrink-0 rotate-180 text-dim" />;

/**
 * 4~10위 줄, 역대 TOP 10 줄. 줄 전체가 게임 상세로 간다.
 * slot: 내 게임 표시 자리(indie/my-fame-marks 가 FAME_CARD_ATTR 로 찾는다). note: 회색 보조 줄("N위까지 n점", "가장 많이 올랐어요")
 */
export function RankRow({ to, rank, item, note, slot }: { to: string; rank: React.ReactNode; item: RankedIndie; note?: React.ReactNode; slot?: string }) {
  const c = item.card;
  return (
    <li>
      <Link
        href={to}
        {...(slot ? { [FAME_CARD_ATTR]: slot } : {})}
        className="fame-row press relative grid grid-cols-[28px_76px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-colors hover:bg-surface-2 sm:grid-cols-[44px_112px_minmax(0,1fr)_auto] sm:gap-x-4"
      >
        <span className="justify-self-center">{rank}</span>
        <Cover item={item} sizes="(max-width: 640px) 76px, 112px" />
        <span className="flex min-w-0 flex-col gap-0.5">
          {/* 제목 옆 "내 게임" 글자는 내 게임일 때만 펴진다(globals.css 의 .fame-own) — 한 줄 안이라 줄 높이가 안 바뀐다 */}
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-bold text-ink">{c.title}</span>
            {slot && <MineLine label={M.myBadge} className="shrink-0 text-[12.5px]" />}
          </span>
          {/* 점수가 맨 앞(굵게). 좁은 화면은 점수, 조회, 찜만 — 개발자, 장르까지 한 줄에 몰면 뒤가 잘려 숫자가 안 보였다 */}
          <span className="truncate text-[12.5px] text-dim">
            <b className="font-bold text-ink-2">{M.score(item.score)}</b>
            {" | "}
            <span className="hidden sm:inline">{`${devGenreOf(item)} | `}</span>
            {`${M.views(c.viewCount)} | ${M.likes(c.likeCount)}`}
          </span>
          {note}
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <ChangeNote change={item.change} />
          <span className={cn(PLATFORM_PILL, "hidden sm:inline-block")}>{platformsOf(item)}</span>
        </span>
      </Link>
    </li>
  );
}

/** 역대 선정작 카드 — 그 달 1위 한 장. 카드 전체가 그 달 TOP 10 순위표로 간다(기획서 S-08) */
export function HistoryRow({ to, monthLabel, item }: { to: string; monthLabel: string; item: RankedIndie | null }) {
  return (
    <li>
      <Link href={to} className="press grid grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair transition-colors hover:bg-surface-2 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:gap-x-4">
        {item ? <Cover item={item} sizes="(max-width: 640px) 104px, 160px" /> : <span className="aspect-[460/215] w-full rounded-[var(--radius-cover)] bg-surface-3" />}
        <span className="flex min-w-0 flex-col gap-0.5">
          {/* 날짜는 한 줄로 — 왼쪽 좁은 칸에 두었더니 "2026년 / 10월" 로 꺾였다 */}
          <span className="whitespace-nowrap text-[12px] font-semibold text-mut">{M.firstOf(monthLabel)}</span>
          <span className="truncate text-[15px] font-bold text-ink">{item?.card.title ?? "-"}</span>
          {item && <span className="truncate text-[12.5px] text-dim">{devGenreOf(item)}</span>}
        </span>
        <span className="sr-only">{M.seeRanking}</span>
        <Chevron />
      </Link>
    </li>
  );
}
