// /playtests — 플레이테스트 모아 보기(2026-10-27, 기획서 3장 5번, 4.3 메이커 멤버십 "플레이테스트 모집 상단 고정").
// 공개 인디 게임의 열린 모집을 마감이 가까운 순서로 세운다. 맨 위 몇 칸은 메이커 멤버십 개발자의 모집이고 "광고" 표시를 단다 —
// 돈을 내고 앞자리에 선 것이라 유료 노출 규칙(기획서 4.1)을 그대로 탄다. 카드 아래에 모집 이름, 마감, 신청 수를 적는다.
import type { Metadata } from "next";
import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { EmptyState } from "@/components/empty-state";
import { IndieCard } from "@/components/indie/indie-card";
import { AdLabel } from "@/components/ui/ad-label";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { formatDate } from "@/lib/format";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { PLAYTEST_MESSAGES as M, PLAYTEST_PHASE_LABEL } from "@/lib/indie/playtest-messages";
import { stagger } from "@/lib/motion";
import { PROMO_MESSAGES } from "@/lib/promo/messages";
import { ROUTES } from "@/lib/routes";
import { listOpenPlaytests, type PlaytestCardDto } from "@/server/services/indie";
import { InvitePanel } from "@/components/ui/invite-panel";
import { INVITE_MESSAGES as IV } from "@/lib/indie/messages";
import { PlusIcon, TicketIcon } from "@/components/ui/icons";

// 신청 수와 마감이 움직이는 화면이라 짧게 캐시한다. 신청, 모집 열기, 마감은 액션이 이 주소를 민다
export const revalidate = 60;

export const metadata: Metadata = { title: M.listTitle, description: M.listLead };

/** 한 줄 칸 수(넓은 화면 4열). 모집이 이보다 적으면 남은 칸에 "다음 테스트 자리" 를 세운다 */
const GRID_FILL = 4;

/** 빈 칸 하나 — 점선 판에 + 와 한 줄. 카드가 한 장뿐인 줄이 비어 보이지 않게, 그 자리가 열려 있다는 것을 말한다(2026-11-16 사용자) */
function OpenSlot() {
  return (
    <li className="hidden lg:flex">
      <Link
        href={ROUTES.indieMine}
        className="press flex min-h-[240px] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border border-dashed border-line-strong text-center text-mut transition-colors hover:border-acc hover:text-acc"
      >
        <PlusIcon size={22} />
        <span className="text-[14px] font-bold">{M.openSlot}</span>
      </Link>
    </li>
  );
}

function Grid({ items, ad, from = 0 }: { items: PlaytestCardDto[]; ad?: boolean; from?: number }) {
  return (
    <ul className={HOME_GRID_CLASS}>
      {items.map(({ card, playtest }, i) => (
        <li key={playtest.id} className="enter-item flex flex-col" style={stagger(from + i)}>
          <IndieCard
            post={card}
            badge={
              <>
                {ad && <AdLabel />}
                <Tag tone={playtest.phase === "open" ? "ok" : "warn"}>{PLAYTEST_PHASE_LABEL[playtest.phase]}</Tag>
              </>
            }
            footer={
              <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-semibold text-ink">{playtest.title}</span>
                <span className="text-[12.5px] tabular-nums text-dim">{[M.closesAt(formatDate(playtest.closesAt)), M.applicants(playtest.applicants, playtest.slots)].join(" | ")}</span>
              </div>
            }
          />
        </li>
      ))}
      {!ad && items.length < GRID_FILL && Array.from({ length: GRID_FILL - items.length }, (_, i) => <OpenSlot key={`open-${i}`} />)}
    </ul>
  );
}

export default async function PlaytestsPage() {
  const board = await nullIfDbUnavailable(listOpenPlaytests());
  return (
    <Page gap={22}>
      <PageHead title={M.listTitle}>
        <p className="text-[14px] text-mut">{M.listLead}</p>
      </PageHead>
      {!board ? (
        <DbUnavailable retryHref={ROUTES.playtests} />
      ) : board.pinned.length + board.rest.length === 0 ? (
        <EmptyState title={M.listEmpty} description={M.listEmptyLead} action={{ href: ROUTES.indie, label: M.toIndie }} />
      ) : (
        <>
          {board.pinned.length > 0 && (
            <section aria-labelledby="playtests-pinned" className="flex flex-col gap-3">
              <SectionHead id="playtests-pinned" title={PROMO_MESSAGES.featuredTitle} />
              <Grid items={board.pinned} ad />
            </section>
          )}
          {board.rest.length > 0 && <Grid items={board.rest} from={board.pinned.length} />}
        </>
      )}
      {/* 참여 권유(components/ui/invite-panel) — 게임이 적을 때 아래가 비어 보이지 않게, 다음 행동 하나를 권한다 */}
      <InvitePanel
        icon={<TicketIcon size={26} />}
        title={IV.playtests.title}
        body={IV.playtests.body}
        secondary={{ href: ROUTES.signUp, label: IV.join }}
        primary={{ href: ROUTES.indieMine, label: IV.playtests.action }}
      />
    </Page>
  );
}
