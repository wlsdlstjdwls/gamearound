// /admin/games/[id] — 데이터 정정(§4.4), 소스 매핑(§4.2), 정정 이력
import { formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatDateTime, PLATFORM_LABEL } from "@/lib/format";
import { CORRECTABLE_FIELDS, getGameForAdmin, SOURCES } from "@/server/services/admin";
import { listAliases } from "@/server/services/admin-aliases";
import { listUpgrades } from "@/server/services/admin-upgrades";
import { platformEnum, upgradeKindEnum } from "@/server/db/schema";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { CorrectionForm, type FieldOption } from "@/components/admin/correction-form";
import { ManualRefForm } from "@/components/admin/manual-ref-form";
import { AliasForm } from "@/components/admin/alias-form";
import { UpgradeForm } from "@/components/admin/upgrade-form";
import { MatchReviewButtons } from "@/components/admin/match-review-buttons";
import { PageHead } from "@/components/ui/page";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { GAME_ADMIN_MESSAGES as M, MATCHED_BY_LABEL, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: M.title };

// 좁은 화면에서는 한 줄이 카드 한 장이다(data-rows.tsx 머리 주석)
const REF_COLS = "md:grid-cols-[110px_minmax(0,1fr)_minmax(0,1.4fr)_110px_78px_150px] md:gap-x-3 md:px-3 md:py-2";
const HISTORY_COLS = "md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_70px] md:gap-x-3 md:px-3 md:py-2";

type GameRow = NonNullable<Awaited<ReturnType<typeof getGameForAdmin>>>;
type PlatformRow = GameRow["platforms"][number];

// 화이트리스트(DB 컬럼명) → 현재값 추출
const GAME_GETTER: Record<keyof typeof CORRECTABLE_FIELDS.games, (g: GameRow) => FieldOption["current"]> = {
  title_ko: (g) => g.titleKo,
  title_en: (g) => g.titleEn,
  description: (g) => g.description,
  cover_url: (g) => g.coverUrl,
  developer: (g) => g.developer,
  publisher: (g) => g.publisher,
  local_max_players: (g) => g.localMaxPlayers,
  online_max_players: (g) => g.onlineMaxPlayers,
  supports_solo: (g) => g.supportsSolo,
  supports_coop: (g) => g.supportsCoop,
  supports_pvp: (g) => g.supportsPvp,
  is_retro: (g) => g.isRetro,
};
const PLATFORM_GETTER: Record<keyof typeof CORRECTABLE_FIELDS.game_platforms, (p: PlatformRow) => FieldOption["current"]> = {
  list_price: (p) => p.listPrice,
  current_price: (p) => p.currentPrice,
  discount_pct: (p) => p.discountPct,
  current_version: (p) => p.currentVersion,
  release_date: (p) => p.releaseDate,
  metacritic_score: (p) => p.metacriticScore,
  opencritic_score: (p) => p.opencriticScore,
};

function gameFields(g: GameRow): FieldOption[] {
  return (Object.keys(CORRECTABLE_FIELDS.games) as (keyof typeof CORRECTABLE_FIELDS.games)[]).map((name) => ({
    name,
    label: CORRECTABLE_FIELDS.games[name].label,
    kind: CORRECTABLE_FIELDS.games[name].kind,
    current: GAME_GETTER[name](g),
  }));
}
function platformFields(p: PlatformRow): FieldOption[] {
  return (Object.keys(CORRECTABLE_FIELDS.game_platforms) as (keyof typeof CORRECTABLE_FIELDS.game_platforms)[]).map((name) => ({
    name,
    label: CORRECTABLE_FIELDS.game_platforms[name].label,
    kind: CORRECTABLE_FIELDS.game_platforms[name].kind,
    current: PLATFORM_GETTER[name](p),
  }));
}

function jsonText(v: unknown): string {
  if (v === null || v === undefined) return "(없음)";
  return typeof v === "string" ? v : JSON.stringify(v);
}

export default async function AdminGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoleOrForbid("admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const game = await getGameForAdmin(id);
  if (!game) notFound();

  const platformLabel = (p: PlatformRow) => PLATFORM_LABEL[p.platform] ?? p.platform;
  const platformById = new Map(game.platforms.map((p) => [p.id, p]));
  const [upgradeRows, aliasRows] = await Promise.all([listUpgrades(game.id), listAliases(game.id)]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-[12.5px] text-dim">
          <Link href={ROUTES.admin} className="hover:text-ink">{M.breadcrumb}</Link> / {M.here}
        </p>
        <PageHead title={game.titleKo ?? game.titleEn} />
        <p className="text-[13px] text-mut">
          {game.titleEn} | <code className="text-xs">{game.slug}</code> |{" "}
          <Link href={`/games/${game.slug}`} className="text-acc hover:underline">{M.openPublic}</Link>
        </p>
        {/* 이 화면에서 고친 값이 다음 수집에 날아가지 않는다는 사실이 이 화면의 전제다 */}
        <p className="mt-1 max-w-[620px] text-[13px] text-mut">{M.lead}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{M.basics}</h2>
        <CorrectionForm table="games" rowId={game.id} gameId={game.id} fields={gameFields(game)} title={M.basicsFormTitle} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{M.aliases}</h2>
        <AliasForm gameId={game.id} items={aliasRows.map((a) => ({ id: a.id, alias: a.alias }))} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{M.upgrades}</h2>
        <UpgradeForm
          gameId={game.id}
          platforms={platformEnum.enumValues}
          kinds={upgradeKindEnum.enumValues}
          items={upgradeRows.map((u) => ({
            id: u.id,
            fromPlatform: u.fromPlatform,
            toPlatform: u.toPlatform,
            kind: u.kind,
            price: u.price,
            storeUrl: u.storeUrl,
            note: u.note,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{M.platforms}</h2>
        {game.platforms.length === 0 ? (
          <p className="text-[13px] text-mut">{M.platformsEmpty}</p>
        ) : (
          game.platforms.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <p className="text-[11.5px] text-dim">
                {platformLabel(p)} | {M.currentPrice} {formatPrice(p.currentPrice, p.currency)} | {M.listPrice}{" "}
                {formatPrice(p.listPrice, p.currency)} | {M.lastSynced} {formatDateTime(p.lastSyncedAt)} |{" "}
                {p.syncStatus ? (SYNC_STATUS_LABEL[p.syncStatus] ?? p.syncStatus) : "-"}
              </p>
              <CorrectionForm table="game_platforms" rowId={p.id} gameId={game.id} fields={platformFields(p)} title={M.platformFormTitle(platformLabel(p))} />
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{M.refs}</h2>
        {game.sourceRefs.length === 0 ? (
          <p className="text-[13px] text-mut">{M.refsEmpty}</p>
        ) : (
          <div>
            <DataHead
              cols={REF_COLS}
              labels={[M.colSource, M.colExternalId, M.colUrl, M.colMatchedBy, M.colConfidence, M.colAction]}
            />
            <DataList>
              {game.sourceRefs.map((r) => (
                <DataRow key={r.source} cols={REF_COLS}>
                  <DataCell label={M.colSource} className="md:whitespace-nowrap">
                    {sourceLabel(r.source)}
                  </DataCell>
                  <DataCell label={M.colExternalId} className="font-mono text-xs">
                    {r.externalId}
                  </DataCell>
                  <DataCell label={M.colUrl}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-[12px] text-acc hover:underline">
                        {r.url}
                      </a>
                    ) : (
                      "-"
                    )}
                  </DataCell>
                  <DataCell label={M.colMatchedBy}>
                    <span
                      className={`inline-block rounded-[5px] px-1.5 py-0.5 text-[11.5px] font-semibold ${r.matchedBy === "pending" ? "bg-warn-soft text-warn" : r.matchedBy === "manual" ? "bg-ok-soft text-ok" : r.matchedBy === "none" ? "bg-surface-2 text-dim-2" : "bg-surface-2 text-ink-2"}`}
                    >
                      {MATCHED_BY_LABEL[r.matchedBy] ?? r.matchedBy}
                    </span>
                  </DataCell>
                  <DataCell label={M.colConfidence}>{r.confidence ?? "-"}</DataCell>
                  <DataCell>
                    {r.matchedBy === "pending" ? (
                      <MatchReviewButtons gameId={game.id} source={r.source} />
                    ) : (
                      <span className="text-[12px] text-dim-2">-</span>
                    )}
                  </DataCell>
                </DataRow>
              ))}
            </DataList>
          </div>
        )}
        <ManualRefForm gameId={game.id} sources={SOURCES} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">{M.history} <span className="text-[13px] font-normal text-dim">{M.historyCount(game.corrections.length)}</span></h2>
        {game.corrections.length === 0 ? (
          <p className="text-[13px] text-mut">{M.historyEmpty}</p>
        ) : (
          <div>
            <DataHead cols={HISTORY_COLS} labels={[M.colWhen, M.colTarget, M.colField, M.colBefore, M.colAfter, M.colLocked]} />
            <DataList>
              {game.corrections.map((c) => {
                const target =
                  c.table === "games"
                    ? "games"
                    : `${c.table} | ${platformById.get(c.rowId) ? platformLabel(platformById.get(c.rowId) as PlatformRow) : c.rowId.slice(0, 8)}`;
                return (
                  <DataRow key={c.id} cols={HISTORY_COLS} align="start">
                    <DataCell label={M.colWhen} className="md:whitespace-nowrap">
                      {formatDateTime(c.createdAt)}
                    </DataCell>
                    <DataCell label={M.colTarget} className="text-xs">
                      {target}
                    </DataCell>
                    <DataCell label={M.colField} className="font-mono text-xs">
                      {c.field}
                    </DataCell>
                    <DataCell label={M.colBefore} className="break-all text-[11.5px] text-mut">
                      {jsonText(c.before)}
                    </DataCell>
                    <DataCell label={M.colAfter} className="break-all text-xs">
                      {jsonText(c.after)}
                    </DataCell>
                    <DataCell label={M.colLocked} className="text-xs">
                      {c.lockField ? M.locked : "-"}
                    </DataCell>
                  </DataRow>
                );
              })}
            </DataList>
          </div>
        )}
      </section>
    </div>
  );
}
