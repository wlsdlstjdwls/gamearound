// 홈 맨 위 세일 배너 — 스팀 정기 세일이 **데이터로 확인됐을 때만** 선다(services/sales, lib/sales/detect).
//
// 달력만 보고 띄우지 않는 이유: 공지 없는 해는 규칙으로 민 날짜라 틀릴 수 있고, 틀린 "진행 중" 은 거짓말이다.
// 세일이 끝나면(종료 시각이 지나거나 묶음이 사라지면) 다음 캐시 갱신 때 저절로 내려간다 — 사람이 끄지 않는다.
//
// 잉크 판을 쓰는 이유(2026-10-02, 사용자: "디자인도 좀 잘해줘"): 첫 판은 연보라 면이었는데, 바로 아래
// 카드 격자의 흰 판, 회청 바탕과 명도가 비슷해 "행사" 가 아니라 안내문처럼 읽혔다. 화면에서 유일하게
// 어두운 면이라 세일 기간에만 첫눈에 걸린다. 색은 토큰(ink, on-ink, acc-on-ink)이라 다크 모드에서는 판이 뒤집힌다.
// 오른쪽 커버 넷은 "무엇이 싸졌나" 를 숫자 대신 보여 준다 — 세일 목록의 인기순 앞 넷이다.
// 넷 다 상세로 가는 링크다(사용자 요청). 보여 준 게임을 눌러 볼 수 없으면 그림이 광고판으로만 남는다.
//
// 서버 컴포넌트다. 초가 움직이는 칸만 클라이언트(Countdown)라 그 칸만 하이드레이션된다.
// 제목을 h 태그로 두지 않는 이유: 바로 위 홈 머리(components/home/hero)가 이 문서의 h1 이다.
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { Countdown } from "@/components/sales/countdown";
import { HideAfter } from "@/components/sales/hide-after";
import { Clamp } from "@/components/ui/tooltip";
import { formatShortDateTime } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import { gamesHref } from "@/lib/games-query";
import { RUNNING_SALE_MESSAGES as M } from "@/lib/sales/messages";
import type { GameSummary } from "@/server/services/games/dto";
import type { RunningSaleDto } from "@/server/services/sales";

/** 배너 오른쪽에 세우는 커버 수. 2 x 2 격자라 넷이다 */
export const SALE_BANNER_PREVIEW = 4;

function PreviewCover({ game }: { game: GameSummary }) {
  const title = game.titleKo ?? game.titleEn;
  const pct = game.best?.discountPct;
  return (
    <li className="min-w-0">
      {/* 링크 이름은 제목 하나다 — 커버 alt 까지 읽히면 같은 제목을 두 번 듣는다(alt 를 비운다) */}
      <Link href={gamePath(game.slug)} className="press group flex min-w-0 flex-col gap-1.5 rounded-[var(--radius-inset)]">
        <div className="lift relative aspect-[460/215] overflow-hidden rounded-[var(--radius-inset)] ring-1 ring-[color-mix(in_oklab,var(--on-ink)_14%,transparent)] transition-shadow duration-base group-hover:ring-[color-mix(in_oklab,var(--on-ink)_40%,transparent)]">
          <CoverImage src={game.coverUrl} alt="" sizes="180px" />
        </div>
        <p className="flex min-w-0 items-baseline gap-1.5 text-[12px]">
          {pct ? <span className="shrink-0 font-extrabold text-acc-on-ink">-{pct}%</span> : null}
          <Clamp className="min-w-0 flex-1 opacity-75 group-hover:underline group-hover:opacity-100">{title}</Clamp>
        </p>
      </Link>
    </li>
  );
}

export function HomeSaleBanner({ sale, preview }: { sale: RunningSaleDto; preview: GameSummary[] }) {
  const covers = preview.filter((g) => g.coverUrl).slice(0, SALE_BANNER_PREVIEW);
  return (
    <HideAfter untilIso={sale.endsAt}>
      <section
        aria-label={M.title(sale.name)}
        className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-ink px-5 py-6 text-on-ink sm:px-8 sm:py-8"
      >
        {/* 빛 번짐 — 브랜드 보라와 스팀 파랑을 모서리에 깐다. 장식이라 읽는 도구에서 숨긴다 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 90% at 0% 0%, color-mix(in oklab, var(--acc-on-ink) 45%, transparent), transparent 70%), radial-gradient(50% 80% at 100% 100%, color-mix(in oklab, var(--store-steam) 35%, transparent), transparent 70%)",
          }}
        />

        <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.08em]">
                <span aria-hidden className="size-2 rounded-full bg-acc-on-ink" />
                {M.label}
              </p>
              <p className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.04em] sm:text-[36px]">{M.title(sale.name)}</p>
              <p className="text-[13.5px] opacity-75">
                {M.count(sale.gameCount)} | {M.endsAt(formatShortDateTime(sale.endsAt))}
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold opacity-70">{M.untilEnd}</span>
                <Countdown targetIso={sale.endsAt} size="tile" />
              </div>
              <Link
                href={gamesHref({}, { event: sale.key })}
                className="press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full bg-on-ink px-5 text-[14px] font-bold text-ink"
              >
                {M.cta}
              </Link>
            </div>
          </div>

          {covers.length > 0 && (
            <ul aria-label={M.previewLabel} className="grid w-full grid-cols-2 gap-3 md:w-[380px] md:shrink-0">
              {covers.map((g) => (
                <PreviewCover key={g.slug} game={g} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </HideAfter>
  );
}
