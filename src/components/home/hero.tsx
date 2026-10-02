// 홈 머리 — 이 서비스가 무엇을 해 주는지 한 줄로 약속하고, 그 약속이 살아 있다는 숫자를 붙인다(2026-10-02).
//
// 전에는 홈이 곧장 "지금 할인 중" 격자로 시작했다. 처음 온 사람은 여기가 무엇을 하는 곳인지 모른 채 카드부터 봤다.
// 검색창을 여기 또 두지 않는다 — 머리글의 검색창이 하나뿐인 입구다(gamearound-ui-decisions 의 "검색창 하나" 원칙).
//
// 브랜드가 말하는 자리는 약속 문장의 한 낱말("제일 싼 곳")뿐이다. 판을 두르거나 그라데이션을 깔지 않는다 —
// 바로 아래 세일 배너가 짙은 판이라 둘이 겹치면 첫 화면이 무거운 덩어리 둘로 시작한다.
import Link from "next/link";
import { formatShortDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { brandKeyOf, PLATFORM_ORDER } from "@/lib/platform";
import type { HomeStats } from "@/server/services/games/dto";
import { stagger } from "@/lib/motion";

/** 스토어 수는 기기 묶음 단위로 센다 — PS5 와 PS4 는 한 스토어다(lib/platform 의 PLATFORM_BRANDS) */
const STORE_COUNT = new Set(PLATFORM_ORDER.map(brandKeyOf)).size;

const number = (n: number) => n.toLocaleString("ko-KR");

export function HomeHero({ stats }: { stats: HomeStats }) {
  const items = [
    { value: number(stats.trackedGames), label: M.statTracked },
    { value: number(stats.onSaleGames), label: M.statOnSale },
    { value: number(STORE_COUNT), label: M.statStores },
  ];
  return (
    <section aria-labelledby="home-hero" className="enter-item flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" style={stagger(0)}>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[13px] font-bold text-acc">{M.heroEyebrow}</p>
        <h1 id="home-hero" className="text-[28px] font-extrabold leading-[1.2] tracking-[-0.04em] text-ink sm:text-[36px]">
          {M.heroLead} <span className="text-acc">{M.heroAccent}</span>
          {M.heroTail}
        </h1>
        <p className="text-[14.5px] text-mut">{M.heroSub}</p>
        {/* 다시 올 이유. 알림(웹푸시)은 이미 돌고 있었는데 들어가는 길이 게임 상세와 머리글 종 그림뿐이었다.
            로그인 전이면 로그인 뒤 이 화면으로 돌아온다((user) 레이아웃의 next) */}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13.5px] text-mut">
          {M.alertPitch}
          <Link href={ROUTES.alerts} className="tap inline-flex items-center font-semibold text-acc hover:underline">
            {M.alertCta}
          </Link>
        </p>
      </div>

      {/* 숫자는 크게, 이름은 작게 — 읽는 순서가 "몇이냐" 다음 "무엇이냐" 다 */}
      <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
        <dl className="flex gap-6">
          {items.map((it) => (
            <div key={it.label} className="flex flex-col-reverse">
              <dt className="text-[12.5px] text-dim">{it.label}</dt>
              <dd className="text-[22px] font-extrabold tabular-nums tracking-[-0.03em] text-ink sm:text-[24px]">{it.value}</dd>
            </div>
          ))}
        </dl>
        {stats.syncedAt && <p className="text-[12px] text-dim">{M.syncedAt(formatShortDateTime(stats.syncedAt))}</p>}
      </div>
    </section>
  );
}
