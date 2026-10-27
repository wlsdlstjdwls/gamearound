// 상세 아래쪽 "업데이트 노트 | 성능 정보" 탭(목업 .tabs). page.tsx 에서 옮겨 왔다(2026-10-27, 300줄 규약).
// 패치 기록도 사양도 없는 게임은 탭 둘에 "없어요" 만 든 큰 판 대신 한 줄로 접는다(game-detail/empty-line).
// 한쪽만 있으면 탭은 그대로 둔다 — 탭이 하나로 줄면 "다른 쪽은 어디 갔지" 가 된다.
import { Suspense } from "react";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { RequirementsBody } from "@/components/requirements-table";
import { RunCheck } from "@/components/run-check";
import { EmptyLine } from "@/components/game-detail/empty-line";
import { CompatSlot, VerdictNoteSlot } from "@/components/game-detail/slots";
import { DetailTabs } from "@/components/game-detail/tabs";
import { sectionCardClass } from "@/components/ui/page";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { COMPAT_MESSAGES, GAME_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { requirementSummary } from "@/lib/games/requirement-summary";
import { latestPatches, type GameDetail, type getGamePatchesCached } from "@/server/services/games";

/**
 * "업데이트 노트" 탭에 담을 패치 기록 수. 시트에 있던 목록(2026-09-15)을 탭으로 펼쳤다(목업).
 * 50 은 상한일 뿐이다 — 스토어가 최근 기록만 돌려줘서 실제로는 게임당 훨씬 적다.
 */
const TAB_PATCH_LIMIT = 50;

type PatchGroups = Awaited<ReturnType<typeof getGamePatchesCached>>;

export function DetailUpdates({ game, patchGroups, upcoming }: { game: GameDetail; patchGroups: PatchGroups; upcoming: boolean }) {
  if (patchGroups.length === 0 && game.requirements.length === 0) {
    return (
      <EmptyLine id="updates-heading" title={D.tabsLabel}>
        {upcoming ? D.updatesEmptyUpcoming : D.updatesEmpty}
      </EmptyLine>
    );
  }
  return (
    <DetailTabs
      label={D.tabsLabel}
      tabs={[
        {
          key: "patches",
          label: D.tabPatches,
          panel: (
            <div className={sectionCardClass("flex min-w-0 flex-col gap-5")}>
              {patchGroups.length > 0 ? (
                <>
                  <PatchSpeed groups={patchGroups} />
                  <PatchList items={latestPatches(patchGroups, TAB_PATCH_LIMIT)} showPlatform={patchGroups.length > 1} />
                </>
              ) : (
                <p className="text-[13px] text-dim">{GAME_MESSAGES.patchNone}</p>
              )}
            </div>
          ),
        },
        {
          key: "perf",
          label: D.tabPerf,
          panel: (
            <div className={sectionCardClass("min-w-0")}>
              {game.requirements.length > 0 ? (
                <RunCheck
                  verdictTitle={COMPAT_MESSAGES.heading}
                  verdictNote={
                    <Suspense fallback={null}>
                      <VerdictNoteSlot groups={game.requirements} />
                    </Suspense>
                  }
                  requirementTitle={GAME_MESSAGES.requirementHeading}
                  requirementNote={requirementSummary(game.requirements) ?? game.requirements.map((g) => OS_FAMILY_LABEL[g.osFamily]).join(", ")}
                  verdict={
                    <Suspense fallback={null}>
                      <CompatSlot groups={game.requirements} platforms={game.platforms} />
                    </Suspense>
                  }
                  requirements={<RequirementsBody groups={game.requirements} />}
                />
              ) : (
                <p className="text-[13px] text-dim">{upcoming ? D.perfUpcoming : D.perfNone}</p>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
