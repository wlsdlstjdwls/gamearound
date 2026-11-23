// 상세 아래쪽 "업데이트 노트 | 성능 정보" 탭(목업 .tabs). page.tsx 에서 옮겨 왔다(2026-10-27, 300줄 규약).
// 패치 기록도 사양도 없는 게임은 탭 둘에 "없어요" 만 든 큰 판 대신 한 줄로 접는다(game-detail/empty-line).
// 한쪽만 있으면 탭은 그대로 둔다 — 탭이 하나로 줄면 "다른 쪽은 어디 갔지" 가 된다.
import { Suspense } from "react";
import { PatchNotesPanel } from "@/components/game-detail/patch-notes-panel";
import { RequirementsBody } from "@/components/requirements-table";
import { RunCheck } from "@/components/run-check";
import { EmptyLine } from "@/components/game-detail/empty-line";
import { PerfRow } from "@/components/game-detail/perf-row";
import { CompatSlot, VerdictNoteSlot } from "@/components/game-detail/slots";
import { DetailTabs } from "@/components/ui/tabs";
import { sectionCardClass } from "@/components/ui/page";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { COMPAT_MESSAGES, GAME_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { requirementSummaryParts } from "@/lib/games/requirement-summary";
import { CpuIcon, GpuIcon, MemoryIcon } from "@/components/ui/icons";
import { tagClass } from "@/components/ui/tag";
import type { GameDetail, getGamePatchesCached } from "@/server/services/games";

/**
 * "업데이트 노트" 탭에 담을 스토어 하나의 패치 기록 수(펴기 전에는 다섯만 보인다, game-detail/patch-notes-panel). 시트에 있던 목록(2026-09-15)을 탭으로 펼쳤다(목업).
 * 50 은 상한일 뿐이다 — 스토어가 최근 기록만 돌려줘서 실제로는 게임당 훨씬 적다.
 */
const TAB_PATCH_LIMIT = 50;

type PatchGroups = Awaited<ReturnType<typeof getGamePatchesCached>>;

/** 접힌 "구동 사양" 머리의 부품 칩 — 최소(없으면 권장) 사양을 부품마다 아이콘과 함께. 아무것도 모르면 운영체제 이름만 */
function SpecChips({ groups }: { groups: GameDetail["requirements"] }) {
  const parts = requirementSummaryParts(groups);
  if (!parts) return <span className="text-[13px] text-dim">{groups.map((g) => OS_FAMILY_LABEL[g.osFamily]).join(", ")}</span>;
  const chips = [
    { key: "cpu", Icon: CpuIcon, text: parts.cpu },
    { key: "gpu", Icon: GpuIcon, text: parts.gpu },
    { key: "ram", Icon: MemoryIcon, text: parts.ram },
  ].filter((c): c is { key: string; Icon: typeof CpuIcon; text: string } => Boolean(c.text));
  return (
    <>
      <span className="text-[12.5px] font-bold text-mut">{parts.tier}</span>
      {chips.map(({ key, Icon, text }) => (
        <span key={key} className={tagClass({ tone: "info", tight: false, className: "gap-1 text-[12px]" })}>
          <Icon size={13} className="shrink-0 text-dim" />
          {text}
        </span>
      ))}
    </>
  );
}

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
                // 마지막 패치일 줄(PatchSpeed)도 고른 플랫폼을 따라야 해서 패널 안으로 들어갔다
                <PatchNotesPanel groups={patchGroups} limit={TAB_PATCH_LIMIT} />
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
            <div className={sectionCardClass("flex min-w-0 flex-col gap-6")}>
              {game.requirements.length > 0 ? (
                <RunCheck
                  verdictTitle={COMPAT_MESSAGES.heading}
                  verdictNote={
                    <Suspense fallback={null}>
                      <VerdictNoteSlot groups={game.requirements} />
                    </Suspense>
                  }
                  requirementTitle={GAME_MESSAGES.requirementHeading}
                  requirementNote={<SpecChips groups={game.requirements} />}
                  verdict={
                    <Suspense fallback={null}>
                      <CompatSlot groups={game.requirements} platforms={game.platforms} />
                    </Suspense>
                  }
                  requirements={<RequirementsBody groups={game.requirements} />}
                  // 플랫폼별 성능도 이 마디 안이다 — 마디를 접으면 같이 접힌다(2026-11-23 사용자)
                  footer={!upcoming && <PerfRow game={game} />}
                />
              ) : (
                <>
                  <p className="text-[13px] text-dim">{upcoming ? D.perfUpcoming : D.perfNone}</p>
                  {/* 사양이 없는 게임(콘솔 전용)은 접는 마디가 없어 플랫폼별 성능만 선다 */}
                  {!upcoming && <PerfRow game={game} />}
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
