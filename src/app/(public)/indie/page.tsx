// /indie — 내가 만든 게임(기획서 v2.0 S-18, 목업 mgPage). 운영진이 승인한 인디 게임만 최신순으로 세운다.
//
// 캐시를 걸지 않는다(services/indie/read 주석). 올린 사람이 곧장 자기 글을 보러 오고, 숨긴 글은 바로 빠져야 한다.
// 배치: 제목과 "내 게임 등록" 단추, 설명 한 줄, 명예의 전당 안내 띠, 주목할 게임(유료), 검색 줄, 카드 격자, 쪽 번호.
// 예전의 어두운 머리 판(IndieListHero)은 내렸다 — 목업은 이 화면을 게시판 형제로 그린다. 판 컴포넌트는 지우지 않고 둔다.
// 개발 단계 칩은 목업에 없지만 남겼다(검색 줄 아래 한 줄) — 데모가 있는 게임만 보고 싶은 사람이 쓰던 기능이다.
// 검색은 GET 폼이라 자바스크립트 없이도 간다 — 주소(?q=, ?scope=)가 곧 상태다(게시판 검색과 같은 규칙).
// 검색 범위 드롭다운은 목업 bsbar 처럼 검색창 앞에 선다(전체, 제목, 내용, 개발사 — lib/indie/query).
// 명예의 전당 안내 띠 아래 "주목할 게임" 은 유료 자리다(2026-10-27, services/promotions). 카드마다 "광고" 를 달고, 거름 없는 첫 쪽에서만 선다 —
// 단계를 골랐거나 검색 중인 사람에게 조건과 상관없는 카드를 끼워 넣지 않는다. 명예의 전당, 슈퍼루키는 돈과 상관없이 그대로다.
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { cn } from "@/lib/cn";
import { DbUnavailable } from "@/components/db-unavailable";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { IndieCard } from "@/components/indie/indie-card";
import { Pagination } from "@/components/pagination";
import { WriteLink } from "@/components/community/write-link";
import { ChevronLeftIcon, SearchIcon, TrophyIcon } from "@/components/ui/icons";
import { FormSelect } from "@/components/ui/select";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { Page, PageHead } from "@/components/ui/page";
import { firstParam } from "@/lib/games-query";
import { INDIE_STAGES } from "@/lib/indie/constants";
import { INDIE_MESSAGES as M, INDIE_SEARCH_SCOPE_LABEL, INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import { INDIE_SEARCH_SCOPE_PARAM, INDIE_SEARCH_SCOPES, parseIndieSearchScope, type IndieSearchScope } from "@/lib/indie/query";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import type { IndieStage } from "@/server/db/schema";
import { listIndiePosts } from "@/server/services/indie";
import { listFeaturedIndie } from "@/server/services/promotions";
import { AdLabel } from "@/components/ui/ad-label";
import { AdTrack } from "@/components/promo/ad-track";
import { SponsoredPanel } from "@/components/promo/sponsored-panel";
import { PROMO_MESSAGES as PM } from "@/lib/promo/messages";

export const metadata: Metadata = { title: M.listTitle, description: M.lead };

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

/** 주목할 게임을 세로 카드 격자로 세우는 최소 장수. 그보다 적으면 가로 카드로 판을 채운다 */
const FEATURED_GRID_MIN = 3;

/** 검색어 상한 — 주소창 손질로 들어오는 긴 문자열이 질의까지 가지 않게(게시판과 같은 값) */
const QUERY_MAX = 100;

function parseStage(raw: string | undefined): IndieStage | undefined {
  return (INDIE_STAGES as readonly string[]).includes(raw ?? "") ? (raw as IndieStage) : undefined;
}

/** 기본값은 빼서 같은 화면이 같은 주소가 되게 한다. 범위는 검색어가 있을 때만 싣는다 — 검색어 없는 범위는 뜻이 없다 */
function indieHref(stage: IndieStage | undefined, q: string, scope: IndieSearchScope, page = 1): string {
  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  if (q) params.set("q", q);
  if (q && scope !== "all") params.set(INDIE_SEARCH_SCOPE_PARAM, scope);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${ROUTES.indie}?${qs}` : ROUTES.indie;
}

export default async function IndiePage({ searchParams }: Props) {
  const sp = await searchParams;
  const stage = parseStage(firstParam(sp.stage));
  const q = (firstParam(sp.q) ?? "").trim().slice(0, QUERY_MAX);
  const scope = parseIndieSearchScope(firstParam(sp[INDIE_SEARCH_SCOPE_PARAM]));
  const pageNum = Math.max(Number(firstParam(sp.page)) || 1, 1);
  const plain = !stage && !q && pageNum === 1;
  // 유료 자리를 못 읽어도 목록은 선다 — 빈 줄로 접는다
  const [loaded, featured] = await Promise.all([orDbDown(listIndiePosts(stage, pageNum, q, scope)), plain ? listFeaturedIndie().catch(() => []) : []]);

  const head = (
    <PageHead title={M.listTitle} action={<WriteLink href={ROUTES.indieNew}>{M.register}</WriteLink>}>
      <p className="text-[14px] text-mut">{M.lead}</p>
    </PageHead>
  );
  // DB 가 안 열린 날: 제목은 세우고 목록 자리에만 안내를 둔다(components/db-unavailable)
  if (loaded === DB_DOWN) {
    return (
      <Page gap={20}>
        {head}
        <DbUnavailable retryHref={ROUTES.indie} />
      </Page>
    );
  }
  const result = loaded;

  return (
    <Page gap={20}>
      {head}

      {/* 명예의 전당 안내(기획서 v2.0 S-18 "명예의 전당에 올라보세요") — 승인된 게임만 서는 화면이라 다음 목표를 함께 말한다.
          2026-10-28 어두운 판 + 빛 웅덩이로 키웠다가, 10-29 사용자 "너무 눈에 띈다" 로 흰 판 한 줄로 낮췄다 — 바로 아래 유료 칸과 목록이
          이 화면의 주인공이다. 강조색은 트로피 하나에만 두고, 판 전체가 링크다(좁은 화면은 꺾쇠, 넓은 화면은 "명예의 전당 보기"). 위치는 그대로다 */}
      <Link href={ROUTES.hallOfFame} className="press group flex items-center gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3 shadow-hair transition-shadow hover:shadow-[var(--elev-2)]">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-acc-soft text-acc">
          <TrophyIcon size={18} strokeWidth={1.9} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-bold text-ink group-hover:text-acc">{M.hofBannerTitle}</span>
          <span className="text-[13px] text-mut">{M.hofBannerLead}</span>
        </span>
        <span className="hidden shrink-0 text-[13.5px] font-semibold text-acc sm:inline">{M.hofBannerCta}</span>
        <ChevronLeftIcon aria-hidden size={16} className="shrink-0 rotate-180 text-dim sm:hidden" />
      </Link>

      {featured.length > 0 && (
        // 홍보 게시판 고정과 같은 유료 자리 판(components/promo/sponsored-panel, 2026-10-29 사용자 "느낌 나게")
        <SponsoredPanel id="indie-featured" title={PM.featuredTitle}>
          {/* 한두 장이면 가로 카드로 판을 채운다(IndieCard 의 wide 주석). 셋이면 세로 카드 세 칸 */}
          <ul className={featured.length >= FEATURED_GRID_MIN ? HOME_GRID_CLASS : cn("grid grid-cols-1 gap-3", featured.length > 1 && "lg:grid-cols-2")}>
            {featured.map(({ boostId, item: post }, i) => (
              <li key={post.slug} className="enter-item min-w-0" style={stagger(i)}>
                <AdTrack boostId={boostId} className="h-full">
                  <IndieCard post={post} badge={<AdLabel />} wide={featured.length < FEATURED_GRID_MIN} />
                </AdTrack>
              </li>
            ))}
          </ul>
        </SponsoredPanel>
      )}

      <NavPendingScope>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav aria-label={M.stageFilterLabel} className="flex flex-wrap gap-1.5">
            <NavChip group="stage" current="page" href={indieHref(undefined, q, scope)} active={!stage}>
              {M.allStages}
            </NavChip>
            {INDIE_STAGES.map((s) => (
              <NavChip key={s} group="stage" current="page" href={indieHref(s, q, scope)} active={stage === s}>
                {INDIE_STAGE_LABEL[s]}
              </NavChip>
            ))}
          </nav>
          <form role="search" action={ROUTES.indie} className="flex min-w-0 items-center gap-1.5">
            {stage && <input type="hidden" name="stage" value={stage} />}
            {/* 공통 드롭다운(ui/select). 감춘 input 이 같은 이름으로 GET 폼에 실린다 */}
            <FormSelect
              name={INDIE_SEARCH_SCOPE_PARAM}
              label={M.searchScopeLabel}
              hideLabel
              size="md"
              className="w-[104px] shrink-0"
              defaultValue={scope}
              options={INDIE_SEARCH_SCOPES.map((s) => ({ value: s, label: INDIE_SEARCH_SCOPE_LABEL[s] }))}
            />
            <span className="tap flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line-strong bg-surface pl-3 pr-1 focus-within:border-acc md:w-[260px] md:flex-none">
              <SearchIcon size={15} className="shrink-0 text-dim" />
              <input type="search" name="q" defaultValue={q} placeholder={M.searchPlaceholder} aria-label={M.searchLabel} className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-dim" />
            </span>
            <button type="submit" className="press tap h-10 shrink-0 rounded-xl bg-acc px-4 text-[14px] font-semibold text-on-ink hover:bg-acc-hover">
              {M.search}
            </button>
          </form>
        </div>
        {q && (
          <p className="flex items-center gap-2 text-[13px] text-mut">
            <span>{M.searchResult(q, result.total, scope === "all" ? undefined : INDIE_SEARCH_SCOPE_LABEL[scope])}</span>
            <NavChip group="search" compact href={indieHref(stage, "", "all")}>
              {M.searchReset}
            </NavChip>
          </p>
        )}

        <PendingRegion>
          {result.items.length === 0 ? (
            q ? (
              <EmptyState title={M.emptySearch} description={M.emptySearchLead} />
            ) : (
              <EmptyState title={stage ? M.emptyStage : M.empty} description={M.emptyDescription} action={{ href: ROUTES.indieNew, label: M.register }} />
            )
          ) : (
            <ul className={HOME_GRID_CLASS}>
              {result.items.map((post, i) => (
                <li key={post.slug} className="enter-item" style={stagger(i)}>
                  <IndieCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </PendingRegion>

        {result.totalPages > 1 && <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => indieHref(stage, q, scope, p)} />}
      </NavPendingScope>
    </Page>
  );
}
