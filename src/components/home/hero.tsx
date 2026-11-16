// 홈 첫 화면 — 검색 한 칸과 바로 가기 다섯(2026-11-16 기획 점검으로 다시 짰다).
//
// 전 모양(10-27 ~ 11-15)은 가운데 정렬 판 위에 빛 웅덩이, 반짝이 여섯, 글자 스침을 얹은 "광고판" 이었다.
// 사용자 "색 남발, 심플하게, 바뀐 게 안 보인다": 홈에 오는 사람이 하려는 일은 꾸밈을 보는 것이 아니라
//   1. 찾는 게임이 있으면 바로 검색하고, 2. 없으면 "할인, 새 게임, 곧 출시, 무료, 인디" 중 하나로 들어가는 것이다.
// 그래서 판, 빛, 반짝이를 걷고 왼쪽 정렬 제목 + 넓은 검색칸 + 그 아래 바로 가기 카드 다섯을 세운다.
// 바로 가기는 상단 메뉴(게임 탐색 > 할인 게임 등) 두 번 눌러야 닿던 길을 한 번으로 줄인다. 모양은 칩이 아니라 이름과 한 줄 설명이 있는 카드다 —
// "길은 길처럼" 보여야 한다(2026-10-28 사용자).
import Link from "next/link";
import { CalendarIcon, ChevronLeftIcon, ClockIcon, GamepadIcon, SearchIcon, SproutIcon, TagIcon } from "@/components/ui/icons";
import { gamesHref } from "@/lib/games-query";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";

const ICON_SIZE = 20;

/** 바로 가기 다섯 — 순서는 이 서비스의 첫 질문(가격) 가까운 것부터 */
const QUICK = [
  { key: "sale", href: gamesHref({}, { onSale: true, sort: "discount" }), icon: <TagIcon size={ICON_SIZE} /> },
  { key: "fresh", href: gamesHref({}, { sort: "release" }), icon: <ClockIcon size={ICON_SIZE} /> },
  { key: "upcoming", href: ROUTES.upcoming, icon: <CalendarIcon size={ICON_SIZE} /> },
  { key: "free", href: gamesHref({}, { maxPrice: 0 }), icon: <GamepadIcon size={ICON_SIZE} /> },
  { key: "indie", href: ROUTES.indie, icon: <SproutIcon size={ICON_SIZE} /> },
] as const;

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-heading" className="flex flex-col gap-5 sm:gap-6">
      <div className="enter-item flex flex-col gap-1.5" style={stagger(0)}>
        <h1 id="home-hero-heading" className="text-[28px] font-extrabold leading-[1.2] tracking-[-0.035em] text-ink sm:text-[36px]">
          {M.heroLead} <span className="text-acc">{M.heroAccent}</span>
        </h1>
        <p className="break-keep text-[15px] leading-[1.6] text-mut sm:text-[16px]">{M.heroBody}</p>
      </div>

      <form
        action={ROUTES.search}
        role="search"
        className="enter-item flex max-w-[720px] items-center gap-2 rounded-2xl border border-line-strong bg-surface p-1.5 pl-4 focus-within:border-acc focus-within:shadow-[0_0_0_3px_var(--acc-glow)]"
        style={stagger(1)}
      >
        <SearchIcon size={20} className="shrink-0 text-dim" />
        <label htmlFor="home-hero-q" className="sr-only">
          {M.heroSearchLabel}
        </label>
        {/* 16px: iOS 가 입력칸을 누를 때 화면을 확대하지 않는 최소 글자 크기 */}
        <input
          id="home-hero-q"
          name="q"
          type="search"
          autoComplete="off"
          placeholder={M.heroSearchPlaceholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-dim"
        />
        <button type="submit" className="press h-12 shrink-0 rounded-xl bg-acc px-6 text-[15px] font-semibold text-on-ink hover:bg-acc-hover">
          {M.heroSearchCta}
        </button>
      </form>

      {/* 바로 가기 — 좁은 화면 두 칸(마지막 하나는 한 줄을 다 쓴다), sm 세 칸, lg 다섯 칸 한 줄 */}
      <nav aria-label={M.quickLabel}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {QUICK.map((q, i) => (
            <li key={q.key} className="enter-item last:col-span-2 sm:last:col-span-1" style={stagger(i + 2)}>
              <Link
                href={q.href}
                className="press group flex h-full items-center gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-[var(--elev-card)] transition-shadow duration-base hover:shadow-[var(--elev-card-hover)]"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-acc-soft text-acc">
                  {q.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-bold text-ink group-hover:text-acc">{M.quick[q.key].title}</span>
                  <span className="truncate text-[12.5px] text-dim">{M.quick[q.key].body}</span>
                </span>
                <ChevronLeftIcon aria-hidden size={16} className="shrink-0 rotate-180 text-dim-2" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
