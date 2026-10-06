// /indie — 인디 홍보 글 목록. 개발자가 직접 올린 게임을 최신순으로 세운다.
//
// 캐시를 걸지 않는다(services/indie/read 주석). 올린 사람이 곧장 자기 글을 보러 오고, 신고로 숨은 글은 바로 빠져야 한다.
// 거르기는 개발 단계 하나뿐이다 — 글 수가 적은 동안 칩을 늘리면 칩마다 빈 화면이 된다.
//
// 머리는 어두운 판(IndieListHero)이고 격자 끝에는 "내 게임도 소개해 보세요" 칸이 선다(2026-10-06 사용자: "심심하다").
// 글이 몇 장 안 되는 지금은 그 칸이 빈자리를 메우면서 올리는 길을 한 번 더 건넨다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { IndieCard } from "@/components/indie/indie-card";
import { Pagination } from "@/components/pagination";
import { IndieListHero } from "@/components/indie/list-hero";
import { ChipLink } from "@/components/ui/chip";
import { PlusIcon } from "@/components/ui/icons";
import { Page } from "@/components/ui/page";
import { firstParam } from "@/lib/games-query";
import { INDIE_STAGES } from "@/lib/indie/constants";
import { INDIE_MESSAGES as M, INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import type { IndieStage } from "@/server/db/schema";
import { listIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: M.title, description: M.lead };

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

function parseStage(raw: string | undefined): IndieStage | undefined {
  return (INDIE_STAGES as readonly string[]).includes(raw ?? "") ? (raw as IndieStage) : undefined;
}

/** 기본값은 빼서 같은 화면이 같은 주소가 되게 한다 */
function indieHref(stage: IndieStage | undefined, page = 1): string {
  const params = new URLSearchParams();
  if (stage) params.set("stage", stage);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${ROUTES.indie}?${qs}` : ROUTES.indie;
}

export default async function IndiePage({ searchParams }: Props) {
  const sp = await searchParams;
  const stage = parseStage(firstParam(sp.stage));
  const pageNum = Math.max(Number(firstParam(sp.page)) || 1, 1);
  const result = await listIndiePosts(stage, pageNum);

  return (
    <Page gap={22}>
      {/* 새로 올라온 게임은 첫 쪽, 거르지 않은 화면에서만 크게 세운다 — 거른 화면에서 다른 단계 게임이 머리에 서면 어긋난다 */}
      <IndieListHero featured={!stage && result.page === 1 ? (result.items[0] ?? null) : null} />

      <nav aria-label={M.stageFilterLabel} className="flex flex-wrap gap-1.5">
        <ChipLink href={indieHref(undefined)} active={!stage} aria-current={!stage ? "page" : undefined}>
          {M.allStages}
        </ChipLink>
        {INDIE_STAGES.map((s) => (
          <ChipLink key={s} href={indieHref(s)} active={stage === s} aria-current={stage === s ? "page" : undefined}>
            {INDIE_STAGE_LABEL[s]}
          </ChipLink>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <EmptyState title={stage ? M.emptyStage : M.empty} description={M.emptyDescription} action={{ href: ROUTES.indieNew, label: M.cta }} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((post, i) => (
            <li key={post.slug} className="enter-item" style={stagger(i)}>
              <IndieCard post={post} />
            </li>
          ))}
          <li className="enter-item" style={stagger(result.items.length)}>
            <Link
              href={ROUTES.indieNew}
              className="press flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border-2 border-dashed border-line-strong px-6 py-8 text-center transition-colors duration-fast hover:border-acc hover:bg-acc-soft"
            >
              <span aria-hidden className="flex size-11 items-center justify-center rounded-full bg-acc-soft text-acc">
                <PlusIcon size={20} />
              </span>
              <span className="text-[15px] font-bold text-ink">{M.ctaTileTitle}</span>
              <span className="max-w-[260px] text-[12.5px] leading-[1.6] text-mut">{M.ctaTileBody}</span>
            </Link>
          </li>
        </ul>
      )}

      {result.totalPages > 1 && <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => indieHref(stage, p)} />}
    </Page>
  );
}
