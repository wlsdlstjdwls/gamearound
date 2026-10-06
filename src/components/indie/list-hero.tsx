// 인디 목록 머리 판 — 이 화면이 무엇이고 왜 올리면 좋은지, 그리고 새로 올라온 게임 하나를 크게.
//
// 홈 세일 배너와 같은 어두운 판을 쓴다(home-sale-banner). 흰 바탕에 카드 몇 장만 서 있으면
// "아직 아무도 안 쓰는 곳" 으로 읽혀 올릴 마음이 안 생긴다(2026-10-06 사용자: "화면이 심심하다").
// 올리는 사람을 데려오는 말(혜택 셋)과 구경 온 사람이 볼 것(새 게임)을 한 판에 같이 세운다.
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { INDIE_MESSAGES as M, INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import { indiePath, ROUTES } from "@/lib/routes";
import type { IndieCardDto } from "@/lib/indie/dto";

export function IndieListHero({ featured }: { featured: IndieCardDto | null }) {
  return (
    <section aria-label={M.heroLabel} className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-ink px-5 py-6 text-on-ink sm:px-8 sm:py-8">
      {/* 빛 번짐 — 브랜드 보라와 숲빛 초록. 장식이라 읽는 도구에서 숨긴다 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 90% at 0% 0%, color-mix(in oklab, var(--acc-on-ink) 45%, transparent), transparent 70%), radial-gradient(50% 80% at 100% 100%, color-mix(in oklab, var(--ok) 35%, transparent), transparent 70%)",
        }}
      />

      <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.08em]">
              <span aria-hidden className="size-2 rounded-full bg-acc-on-ink" />
              {M.heroLabel}
            </p>
            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.04em] sm:text-[36px]">{M.heroTitle}</h1>
            <p className="max-w-[460px] text-[13.5px] leading-[1.6] opacity-75">{M.heroLead}</p>
          </div>

          <ul className="flex flex-col gap-1.5 text-[13px]">
            {M.heroPoints.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-acc-on-ink" />
                {p}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={ROUTES.indieNew} className="press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full bg-on-ink px-5 text-[14px] font-bold text-ink">
              {M.cta}
            </Link>
            <Link href={ROUTES.indieMine} className="press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full px-4 text-[13.5px] font-semibold opacity-80 hover:opacity-100">
              {M.mine}
            </Link>
          </div>
        </div>

        {featured && (
          <Link href={indiePath(featured.slug)} className="press group flex w-full min-w-0 flex-col gap-2.5 md:w-[460px] md:shrink-0">
            <span className="text-[12px] font-semibold opacity-70">{M.featuredLabel}</span>
            <span className="lift relative aspect-[460/215] overflow-hidden rounded-[var(--radius-md)] ring-1 ring-[color-mix(in_oklab,var(--on-ink)_14%,transparent)] transition-shadow duration-base group-hover:ring-[color-mix(in_oklab,var(--on-ink)_40%,transparent)]">
              <CoverImage src={featured.cover.url} alt="" sizes="(max-width: 768px) 100vw, 460px" priority />
            </span>
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-[12px] font-extrabold text-acc-on-ink">{INDIE_STAGE_LABEL[featured.stage]}</span>
              <Clamp className="min-w-0 flex-1 text-[15px] font-bold group-hover:underline">{featured.title}</Clamp>
            </span>
            <Clamp lines={1} className="text-[12.5px] opacity-70">
              {featured.tagline}
            </Clamp>
          </Link>
        )}
      </div>
    </section>
  );
}
