// 출시예정 화면 — "무엇을 기다리나" 에 답하는 축.
//
// 목록(/games)의 최신 출시순과 갈라 둔 이유: 그 화면은 "무엇이 나왔나" 를 묻는다.
// 한 정렬에 겹쳐 두면 아직 못 사는 게임이 첫 페이지를 차지해 둘 다 못 읽는다.
//
// 달로 묶고 카드마다 날짜를 적는다. 날짜마다 머리를 달면 70장에 머리가 60개라 목록이 안 보이고,
// 달 머리 하나만 두면 "이번 주인가" 를 세어 봐야 한다 — 요일까지 카드에 적어 그 셈을 없앤다.
//
// **자르는 단위가 달이다**(2026-09-22, 사용자 지적: "10월꺼 추가되면...? 더 미래의 출시 예정작들도
// 있을거 아냐"). 전체를 날짜순으로 90개만 자르던 시절에는 이번 달 하나가 그 90칸을 다 먹어
// 다음 달부터가 화면에 아예 없었다. 근거와 수치는 services/games/upcoming 의 UPCOMING_MONTH_LIMIT.
//
// **줄에서 카드로 바꿨다**(2026-09-21). 이 화면이 답하는 질문은 "무엇을 기다리나" 인데, 아직 못 사는
// 게임을 고르는 단서는 값도 평점도 아니고 커버 한 장이다 — 줄에서는 그 커버가 92px 였다.
// 목록(/games)과 같은 격자, 같은 카드를 쓴다. 이 화면만 다른 모양이면 같은 게임이 화면마다
// 다르게 생겨서, 목록에서 기억한 그림을 여기서 다시 찾아야 한다.
import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { formatMonthLabel, formatReleaseDay } from "@/lib/format";
import { UPCOMING_MESSAGES as M, upcomingCountText } from "@/lib/games/messages";
import { GAMES_GRID_CLASS } from "@/lib/games/grid";
import { stagger } from "@/lib/motion";
import { getUpcomingGames } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

/** 달 마디의 닻. 달 열쇠("2026-10")를 그대로 쓰면 주소에 그 달이 보인다 — 공유한 링크가 말이 된다 */
const monthAnchor = (key: string) => `m${key}`;

/**
 * 건너뛰기 줄을 연도로 묶는다(2026-09-22 2차, 사용자 지적: "너무 투박하잖아 구분도 잘 안되고,
 * 년도도 반복되고").
 *
 * 처음에는 "2026년 9월", "2026년 10월" ... 을 칩으로 늘어놓았다. 한 화면에 여덟 칸이면 "2026년" 이
 * 네 번, "2027년" 이 네 번 반복되는데 **그 글자는 칸을 가르는 데 아무 일도 안 한다** — 눈이 가려야
 * 하는 것은 달이고, 연도는 어디서 바뀌는지만 알면 된다. 연도를 묶음 머리로 한 번만 세우고
 * 칸에는 달만 남기면 읽을 글자가 절반으로 준다.
 */
function byYear(months: { key: string; total: number }[]): { year: string; months: { key: string; month: string; total: number }[] }[] {
  const out: { year: string; months: { key: string; month: string; total: number }[] }[] = [];
  for (const m of months) {
    const [year, month] = m.key.split("-");
    // 달 열쇠는 날짜 오름차순이라 같은 해가 반드시 붙어 온다 — 맨 뒤 묶음만 보면 된다
    const last = out[out.length - 1];
    const bucket = last?.year === year ? last : (out.push({ year, months: [] }), out[out.length - 1]);
    bucket.months.push({ key: m.key, month: `${Number(month)}월`, total: m.total });
  }
  return out;
}

export default async function UpcomingPage() {
  const months = await getUpcomingGames();

  return (
    <Page gap={30}>
      {/* 제목은 낭독기에만 남긴다(2026-09-21, 목록 화면과 같은 규칙). 건수도 같이 뗐다 —
          달마다 서는 구분 머리(SectionHead)가 이미 그 달의 건수를 말한다.

          머리말과 "전체 게임 보기" 버튼도 뗐다(2026-09-22, 사용자 지정). 머리말은 첫 달 머리가
          곧바로 말하는 사실("2026년 10월")을 문장으로 한 번 더 했고, 버튼은 머리띠의 메뉴와
          같은 자리로 가는 두 번째 입구였다. 담는 기준은 맨 아래 각주(M.basis)가 그대로 갖는다 */}
      <PageHead title={M.title} hideTitle />

      {/*
        달 건너뛰기 줄(2026-09-22, 사용자 지적: "이러면 9월 이후로 있는 지 안보이잖아" →
        "너무 투박하잖아" → "아래로 스크롤하면 더이상 고르지도 못하고").

        무엇을 푸는가: 달마다 자르고 나서도 첫 화면에는 이번 달 24장뿐이라, 다음 달이 있는지 알려면
        스크롤을 끝까지 내려 봐야 한다. 어느 달이 있고 몇 개가 있는지는 **목록을 읽기 전에** 답할
        질문이라 맨 위에 둔다. 닻 링크라 JS 없이 동작한다.

        세 번 고쳐 지금 모양이 된 이유:
          1) **연도를 묶음 머리로 뺐다**(byYear). 칩마다 "2026년" 을 붙이면 같은 글자가 네 번 서고,
             정작 눈이 골라야 하는 달이 그 뒤에 묻힌다.
          2) **줄을 붙여 둔다**(sticky). 목록을 내려 읽는 동안에도 다음 달로 갈 수 있어야 한다 —
             맨 위에만 있으면 한 달을 다 본 사람이 다시 꼭대기로 올라가야 다음 달을 고른다.
             머리띠(--header-h) 바로 아래에 서고, 뒤가 비쳐 보이면 카드와 겹쳐 읽히므로 면을 깐다.
          3) **좌우 여백 밖까지 면을 편다**(-mx + px). 안 그러면 붙어 있는 띠의 양옆으로 카드가
             지나가는 것이 보인다. 넘치면 가로로 밀고, 스크롤바는 감춘다(줄 하나짜리 띠라 그 자체가
             두 번째 줄이 된다).

        달이 하나뿐이면 세우지 않는다 — 건너뛸 데가 없는 건너뛰기 줄은 제목을 한 번 더 쓰는 일이다.
      */}
      {months.length > 1 && (
        <nav
          aria-label="달로 건너뛰기"
          className="sticky top-[var(--header-h)] z-20 -mx-5 flex h-[var(--month-nav-h)] items-center gap-4 overflow-x-auto border-b border-line bg-bg/95 px-5 backdrop-blur [scrollbar-width:none] sm:-mx-7 sm:px-7"
        >
          {byYear(months).map((group) => (
            <div key={group.year} className="flex shrink-0 items-center gap-1.5">
              {/* 연도는 누르는 것이 아니라 묶음 이름표다 — 꼬리표 크기, 자간을 벌려 칩과 격을 가른다 */}
              <span className="shrink-0 text-[11px] font-bold tracking-[0.08em] text-dim-2">{group.year}</span>
              {group.months.map((m) => (
                <a
                  key={m.key}
                  href={`#${monthAnchor(m.key)}`}
                  className="press shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[12.5px] font-bold text-ink-2 transition-colors duration-base hover:bg-surface-3 hover:text-ink"
                >
                  {m.month}
                  {/* 건수는 같은 칩 안에서 한 단 물러난다 — 고르는 값은 달이고 숫자는 그 달의 크기다 */}
                  <span className="ml-1 text-[11.5px] font-medium text-dim">{m.total}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
      )}

      {months.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-dim">{M.empty}</p>
      ) : (
        months.map((month) => (
          // scroll-mt: 닻으로 내려왔을 때 제목이 가려지지 않게 위에 떠 있는 것들의 높이만큼 띄운다.
          // 머리띠만 빼면 모자란다(2026-09-22, 사용자 지적: "버튼누르면 스크롤이동되는데 헤더에 가려지네") —
          // 그 아래 달 건너뛰기 띠가 한 겹 더 서 있어서, 뺄 것이 둘이다
          <section key={month.key} id={monthAnchor(month.key)} className="flex scroll-mt-[calc(var(--header-h)+var(--month-nav-h)+16px)] flex-col gap-4">
            <SectionHead title={formatMonthLabel(month.key)} note={upcomingCountText(month.items.length, month.total)} />
            <ul className={GAMES_GRID_CLASS}>
              {month.items.map((entry, i) => (
                <li key={entry.game.slug} className="enter-item" style={stagger(i)}>
                  <GameCard game={entry.game} variant="release" releaseText={formatReleaseDay(entry.releaseDate)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* 각주는 면을 깔지 않는다 — 이 화면에서 면을 가진 것은 빈 상태 안내 하나뿐이고,
          각주까지 판을 쓰면 읽는 순서가 "각주가 먼저" 로 뒤집힌다 */}
      <p className="max-w-[760px] text-[12px] leading-[1.8] text-dim">{M.basis}</p>
    </Page>
  );
}
