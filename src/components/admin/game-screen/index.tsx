"use client";
// 게임 고치기 화면 본문(/admin/games/[id], 2026-10-30). 백오피스 상품등록 꼴: 위 게임 묶음(코드/명), 아래 탭 여섯.
// 앞 판은 마디 여섯을 위아래로 쌓은 긴 한 장이었고(폼 + data-rows 표), 고친 기록을 보려면 끝까지 내려가야 했다.
//
// 탭: 값 고치기(게임 공통 + 기종별 칸 한 그리드, 툴바 저장), 기종별 값(조회), 스토어 연결(승인/반려 + 수동 연결),
// 검색 별칭, 세대 업그레이드(추가, 삭제), 고친 기록(조회). 칸 많은 화면이라 탭을 쓴다(admin-form-rules).
// 툴바 저장은 값 고치기 탭만 쓴다 — 다른 탭의 추가는 묶음 머리 단추가 곧 저장이고 저장 전 상태를 들고 있지 않다.
// 판정 대기 스토어가 있으면 그 탭부터 연다 — 이 화면에 오는 가장 흔한 까닭이 매칭 판정이다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { reportDirty } from "@/components/admin/program-shell/store";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { CodeName, Field, FormSection, ReadValue, ScreenTabs } from "@/components/admin/screen/layout";
import { GAME_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import { AliasesTab } from "./aliases-tab";
import { FieldsTab, useCorrection } from "./fields-tab";
import { RefsTab } from "./refs-tab";
import type { GameScreenData, HistoryRow, PlatformRow } from "./types";
import { UpgradesTab } from "./upgrades-tab";

type Tab = "fields" | "platforms" | "refs" | "aliases" | "upgrades" | "history";

const PLATFORM_COLUMNS: GridCol<PlatformRow>[] = [
  { key: "label", label: M.colPlatform, width: "minmax(120px,1fr)", value: (r) => r.label },
  { key: "current", label: M.colCurrentPrice, width: "104px", align: "right", value: (r) => r.currentPrice },
  { key: "list", label: M.colListPrice, width: "104px", align: "right", value: (r) => r.listPrice },
  { key: "synced", label: M.colLastSynced, width: "136px", align: "center", value: (r) => r.lastSynced },
  { key: "status", label: M.colSyncStatus, width: "96px", align: "center", value: (r) => r.status },
];

const HISTORY_COLUMNS: GridCol<HistoryRow>[] = [
  { key: "when", label: M.colWhen, width: "128px", align: "center", value: (r) => r.when },
  { key: "target", label: M.colTarget, width: "108px", value: (r) => r.target },
  { key: "field", label: M.colField, width: "128px", value: (r) => r.field },
  { key: "before", label: M.colBefore, width: "minmax(140px,1fr)", value: (r) => r.before },
  { key: "after", label: M.colAfter, width: "minmax(140px,1fr)", value: (r) => r.after },
  { key: "locked", label: M.colLocked, width: "56px", align: "center", value: (r) => (r.locked ? M.locked : "-") },
];

export function GameScreen({ data }: { data: GameScreenData }) {
  const router = useRouter();
  const { game } = data;
  const [tab, setTab] = useState<Tab>(data.refs.some((r) => r.matchedBy === "pending") ? "refs" : "fields");
  const c = useCorrection(game.id, data.fields);

  useEffect(() => {
    reportDirty(c.dirty);
    return () => reportDirty(false);
  }, [c.dirty]);

  return (
    <>
      <AdminScreenHead
        title={game.title}
        tools={{
          retrieve: () => {
            c.reset();
            router.refresh();
          },
          save: tab === "fields" ? () => c.save() : undefined,
          saveDisabled: tab !== "fields" || !c.dirty,
          saving: c.saving,
          dirty: c.dirty,
        }}
        actions={
          <a href={game.publicHref} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-acc hover:underline">
            {M.openPublic}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        }
      />
      <div className="flex flex-col gap-3">
        <FormSection title={M.sectionGame} labelWidth="88px">
          <Field label={M.fieldCodeName} wide>
            <CodeName code={game.slug}>
              <ReadValue>
                <span className="truncate">{game.title}</span>
              </ReadValue>
            </CodeName>
          </Field>
          <Field label={M.fieldTitleEn} wide>
            <ReadValue>
              <span className="truncate">{game.titleEn}</span>
            </ReadValue>
          </Field>
          <Field label={M.fieldPlatformCount}>
            <ReadValue align="right">{M.count(data.platforms.length)}</ReadValue>
          </Field>
          <Field label={M.fieldRefCount}>
            <ReadValue align="right">{M.count(data.refs.length)}</ReadValue>
          </Field>
        </FormSection>
        <ScreenTabs
          label={M.tabsLabel}
          active={tab}
          onChange={(k) => setTab(k as Tab)}
          tabs={[
            { key: "fields", label: M.tabFields, panel: <FieldsTab fields={data.fields} c={c} /> },
            {
              key: "platforms",
              label: M.tabPlatforms,
              panel: <DataGrid label={M.platformsListLabel} columns={PLATFORM_COLUMNS} rows={data.platforms} rowKey={(r) => r.id} empty={M.platformsEmpty} />,
            },
            { key: "refs", label: M.tabRefs, panel: <RefsTab gameId={game.id} refs={data.refs} sources={data.sources} /> },
            { key: "aliases", label: M.tabAliases, panel: <AliasesTab gameId={game.id} aliases={data.aliases} /> },
            { key: "upgrades", label: M.tabUpgrades, panel: <UpgradesTab gameId={game.id} upgrades={data.upgrades} platforms={data.platformOptions} kinds={data.kinds} /> },
            {
              key: "history",
              label: M.tabHistory,
              panel: <DataGrid label={M.historyListLabel} columns={HISTORY_COLUMNS} rows={data.history} rowKey={(r) => r.id} paging empty={M.historyEmpty} />,
            },
          ]}
        />
      </div>
    </>
  );
}
