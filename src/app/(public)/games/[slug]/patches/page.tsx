// 패치 기록 — 플랫폼별 전체 목록 + 패치 속도 비교 (기획서 v2 2번).
// 본문은 담지 않으므로 한 줄은 "버전 + 제목 + 날짜"가 전부다(§10 저작권). 본문은 스토어 페이지로 보낸다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { platformLabel } from "@/lib/format";
import { GAME_MESSAGES, patchSpeedText } from "@/lib/games/messages";
import { gamePath } from "@/lib/routes";
import { displayTitle, getGameBySlugCached, getGamePatchesCached } from "@/server/services/games";

type Props = { params: Promise<{ slug: string }> };

/**
 * 표 밑에 한 번 적는 단서. 속도 값이 "언제부터의 기록인지"를 말하지 않으면
 * 수집을 늦게 시작한 플랫폼이 "패치를 안 하는 플랫폼"으로 읽힌다.
 */
const FOOTNOTE = `${GAME_MESSAGES.patchScopeNote} 스토어가 돌려주는 최근 기록만 받아 오므로 그보다 오래된 패치는 빠져 있어요. ${GAME_MESSAGES.patchSourceNote}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) return { title: "게임을 찾을 수 없음" };
  const title = displayTitle(game);
  return { title: `${title} 패치 기록`, description: `${title}의 플랫폼별 패치 기록과 패치 속도` };
}

export default async function PatchesPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) notFound();

  const groups = await getGamePatchesCached(slug);
  const title = displayTitle(game);

  return (
    <Page gap={20}>
      <nav aria-label="브레드크럼">
        <Link href={gamePath(game.slug)} className="text-[12.5px] text-dim transition-colors hover:text-ink">
          {title} 상세로
        </Link>
      </nav>

      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">{GAME_MESSAGES.patchHeading}</h1>

      {groups.length === 0 ? (
        <EmptyState
          title="아직 모은 패치 기록이 없어요"
          description={GAME_MESSAGES.patchSourceNote}
          action={{ href: gamePath(game.slug), label: "상세로 돌아가기" }}
        />
      ) : (
        <>
          <PatchSpeed groups={groups} />

          {groups.map((g) => {
            const label = platformLabel(g);
            return (
              <section key={`${g.platform}:${g.region}`} aria-label={`${label} 패치 기록`} className="flex flex-col gap-3">
                <SectionHead title={label} note={patchSpeedText(g.averageIntervalDays, g.count)} />
                <Card className="px-4">
                  <PatchList items={g.notes} />
                </Card>
              </section>
            );
          })}
        </>
      )}

      <p className="max-w-[760px] text-[12px] leading-[1.8] text-dim">{FOOTNOTE}</p>
    </Page>
  );
}
