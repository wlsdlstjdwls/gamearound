// 라운지 홈 맨 위 블록(2026-11-18 사용자 손질로 내 개발 현황 한 판만 남고, 플레이테스트 줄은 걷었다, 인원 모집/개발 팁은 숨김). 처음 모양은 블록 셋(2026-11-18 사용자 시안 C 확정, docs/라운지홈_시안_2026-11-18.html).
//   내 개발 현황: 윗줄 상태(등록, 검토 중, 새 댓글), 아랫줄 지난 30일 반응(조회, 플레이하기 클릭, 새 찜, 댓글, services/indie 의 getMyIndieTrend, 주/월 증감률)
//   (플레이테스트 모집 줄은 2026-11-18 사용자 "해당 영역은 없애줘" 로 걷었다. 플레이테스트 화면은 그대로다)
//   새 글 줄(LatestBlock): 인원 모집, 개발 팁 — 숨긴 갈래라 지금은 부르는 곳이 없다(lib/community/constants 의 HIDDEN_POST_CATEGORIES)
// 모양은 소식 블록(community/news-blocks)과 같은 흰 판, 같은 머리다. 파랑은 쓰지 않는다 — 화면의 파랑은 머리의 "글 작성" 하나다(사용자 "파란색 남발").
import Link from "next/link";
import { AuthorName } from "@/components/community/badges";
import { EmptyRow, HeadLink, MetaLine, NEWS_BOX, NewsHead, TitleLine } from "@/components/community/news-blocks";
import { INDIE_PROMO_MESSAGES as P } from "@/lib/indie/promo-messages";
import { LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { ChatIcon, EyeIcon, GamepadIcon, HeartIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { trendChange, type TrendChange } from "@/lib/indie/trend";
import type { IndieStatsTrend } from "@/lib/indie/dto";
import type { PostRowDto } from "@/server/services/community";

const ROW = "row-beam group flex min-w-0 flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5";

/**
 * 타일 숫자(지난 30일 합) 아래 증감 "▲ 4". 견주는 것은 그 앞 30일이다 — 큰 숫자와 같은 기간이라 "월" 같은 이름을 붙이지 않는다.
 * 2026-11-18 사용자 손질 셋: "주 +25% 월 -10%" 에서 "▲ ▼ 로, 주 월 표기 없이", 이어 "100% 가 아니라 몇 개 증가했는지", "새로 표기는 별로".
 * 그래서 앞 30일 대비 늘고 준 개수 하나만 적는다(주 수치는 getMyIndieTrend 가 계속 받는다). 같으면 아무것도 적지 않는다.
 * 상승은 빨강, 하락은 파랑(한국 주식 화면 관례). ▲▼ 는 사용자가 고른 표기라 AGENTS 4장의 화살표 금지(←→↑↓)와 별개로 쓴다.
 * 낭독기에는 기호 대신 "늘었어요/줄었어요" 를 말로 준다
 */
function TrendText({ change }: { change: TrendChange }) {
  if (change.kind === "flat") return null;
  const up = change.kind === "up";
  return (
    <span className={up ? "text-danger" : "text-acc"}>
      <span aria-hidden>{`${up ? L.trendUp : L.trendDown} ${change.diff.toLocaleString("ko-KR")}`}</span>
      <span className="sr-only">{L.trendSr(up, change.diff)}</span>
    </span>
  );
}

/** 상태 칸 하나(등록, 검토 중, 새 댓글). 누르는 칸은 링크다 */
type StatusCell = { label: string; value: number; unit: string; href?: string };

/**
 * 내 개발 현황 한 판(2026-11-18 사용자 손질 둘째 회차).
 * 첫 회차: 큰 현황 띠와 내 게임 통계를 두 줄 글자판으로 합쳤더니 "너무 밋밋함, 다르게 표현하거나 급상승 밑으로". 그래서
 * - 자리는 급상승 인기글 **아래**다(lounge/page). 라운지의 첫 눈길은 남의 글이고, 내 숫자는 그 뒤에 확인한다.
 * - 모양은 지난 30일 반응 넷을 **아이콘 + 큰 숫자 타일**로 세운다. 색은 더하지 않는다 — 0 은 회색, 움직인 수만 먹색 굵게라 숫자가 그림이 된다.
 * - 상태(등록, 검토 중, 새 댓글)는 머리 줄 옆 작은 알약이다. 새 댓글 알약은 댓글함으로 가는 링크다.
 * 게임이 없으면 등록 길 한 줄로 접는다
 */
export function DevStatusCard({ status, trend, hasGames }: { status: StatusCell[]; trend: IndieStatsTrend | null; hasGames: boolean }) {
  const tiles = trend
    ? [
        { label: P.statsViews, cell: trend.views, Icon: EyeIcon },
        { label: P.statsPlays, cell: trend.plays, Icon: GamepadIcon },
        { label: P.statsLikes, cell: trend.likes, Icon: HeartIcon },
        { label: P.statsComments, cell: trend.comments, Icon: ChatIcon },
      ]
    : [];
  const moved = (v: number) => (v > 0 ? "text-ink" : "text-dim");
  return (
    <section aria-labelledby="dev-status-heading" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="dev-status-heading" className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
          {L.statusLabel}
        </h2>
        {hasGames && (
          <ul className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            {status.map((c) => {
              const pill = cn("inline-flex items-baseline gap-1 rounded-full bg-surface-2 px-2.5 py-1", c.value > 0 ? "font-bold text-ink" : "font-medium text-mut");
              const text = `${c.label} ${c.value.toLocaleString("ko-KR")}${c.unit}`;
              return (
                <li key={c.label}>
                  {c.href ? (
                    <Link href={c.href} className={cn(pill, "press transition-colors hover:bg-surface-3")}>
                      {text}
                    </Link>
                  ) : (
                    <span className={pill}>{text}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <span className="ml-auto">
          <HeadLink href={hasGames ? ROUTES.indieMine : ROUTES.indieNew}>{hasGames ? L.statDetail : L.register}</HeadLink>
        </span>
      </div>
      {!hasGames ? (
        <div className={NEWS_BOX}>
          <EmptyRow title={L.noGamesTitle} lead={L.noGamesLead} />
        </div>
      ) : (
        tiles.length > 0 && (
          <div className={cn(NEWS_BOX, "flex flex-col gap-3 p-3 sm:p-4")}>
            <div className="flex items-baseline justify-between gap-3 px-1">
              {/* 머리 한 줄(2026-11-18 사용자 "지난 30일 반응 | 앞 30일 대비" 를 다르게): 기간은 굵게, 기호의 뜻은 옆에 작게 */}
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] font-bold text-ink">{L.myStatsNote}</span>
                <span className="text-[12px] text-dim">{L.myStatsCompare}</span>
              </span>
              <HeadLink href={ROUTES.indieStats}>{L.myStatsMore}</HeadLink>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tiles.map(({ label, cell, Icon }, i) => (
                <div key={label} className="enter-item flex items-start gap-3 rounded-[var(--radius-md)] bg-surface-4 px-3.5 py-3" style={stagger(i)}>
                  <span aria-hidden className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface", moved(cell.month))}>
                    <Icon size={17} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <dt className="truncate text-[12px] text-mut">{label}</dt>
                    <dd className="flex flex-col">
                      <span className={cn("text-[24px] font-black leading-tight tracking-[-0.03em] tabular-nums", moved(cell.month))}>{cell.month.toLocaleString("ko-KR")}</span>
                      <span className="text-[12px] font-bold tabular-nums">
                        <TrendText change={trendChange(cell.month, cell.prevMonth)} />
                      </span>
                    </dd>
                  </span>
                </div>
              ))}
            </dl>
          </div>
        )
      )}
    </section>
  );
}

/** 갈래 하나의 새 글 줄(인원 모집, 개발 팁). 비면 한 마디로 자리를 지킨다 — 새 갈래라 "여기 쓸 수 있다" 를 알리는 자리이기도 하다 */
export function LatestBlock({ id, title, note, href, posts, empty, now }: { id: string; title: string; note: string; href: string; posts: PostRowDto[]; empty: string; now: number }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-2.5">
      <NewsHead id={id} title={title} note={note} action={<HeadLink href={href}>{L.allLink}</HeadLink>} />
      <div className={`${NEWS_BOX} flex-1`}>
        {posts.length === 0 ? (
          <EmptyRow title={empty} lead={L.firstPostLead} />
        ) : (
          <ul className="divide-y divide-line-soft">
            {posts.map((p, i) => (
              <li key={p.id} className="enter-item" style={stagger(i)}>
                <Link href={p.href} className={ROW}>
                  <MetaLine post={p} now={now} />
                  <TitleLine post={p} />
                  <span className="flex min-w-0 text-[12.5px] text-dim">
                    <AuthorName post={p} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
