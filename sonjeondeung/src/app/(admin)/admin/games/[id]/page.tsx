// /admin/games/[id] — 데이터 정정(§4.4), 소스 매핑(§4.2), 정정 이력
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatDateTime, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { CORRECTABLE_FIELDS, getGameForAdmin, SOURCES } from "@/server/services/admin";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { CorrectionForm, type FieldOption } from "@/components/admin/correction-form";
import { ManualRefForm } from "@/components/admin/manual-ref-form";
import { MatchReviewButtons } from "@/components/admin/match-review-buttons";

export const metadata: Metadata = { title: "게임 데이터 정정" };

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

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs text-slate-500"><Link href="/admin" className="hover:text-amber-300">대시보드</Link> / 게임 정정</p>
        <h1 className="text-xl font-bold">{game.titleKo ?? game.titleEn}</h1>
        <p className="text-sm text-slate-400">
          {game.titleEn} · <code className="text-xs">{game.slug}</code> ·{" "}
          <Link href={`/games/${game.slug}`} className="text-amber-300 hover:underline">공개 페이지 보기</Link>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">기본 정보 정정</h2>
        <CorrectionForm table="games" rowId={game.id} gameId={game.id} fields={gameFields(game)} title="games 필드" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">플랫폼별 정정</h2>
        {game.platforms.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 플랫폼이 없습니다.</p>
        ) : (
          game.platforms.map((p) => (
            <div key={p.id} className="space-y-2">
              <p className="text-xs text-slate-400">
                {platformLabel(p)} · 현재가 {formatKrw(p.currentPrice)} · 정가 {formatKrw(p.listPrice)} · 마지막 수집 {formatDateTime(p.lastSyncedAt)} · {p.syncStatus ?? "-"}
              </p>
              <CorrectionForm table="game_platforms" rowId={p.id} gameId={game.id} fields={platformFields(p)} title={`${platformLabel(p)} 필드`} />
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">소스 매핑</h2>
        {game.sourceRefs.length === 0 ? (
          <p className="text-sm text-slate-400">매핑된 소스가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs text-slate-400">
                <tr>
                  <th className="px-3 py-2">소스</th>
                  <th className="px-3 py-2">외부 ID</th>
                  <th className="px-3 py-2">URL</th>
                  <th className="px-3 py-2">매칭</th>
                  <th className="px-3 py-2">유사도</th>
                  <th className="px-3 py-2">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {game.sourceRefs.map((r) => (
                  <tr key={r.source}>
                    <td className="px-3 py-2">{r.source}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.externalId}</td>
                    <td className="max-w-xs px-3 py-2">
                      {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-xs text-amber-300 hover:underline">{r.url}</a> : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${r.matchedBy === "pending" ? "bg-amber-900/60 text-amber-300" : r.matchedBy === "manual" ? "bg-sky-900/60 text-sky-300" : "bg-slate-800 text-slate-300"}`}>
                        {r.matchedBy}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.confidence ?? "-"}</td>
                    <td className="px-3 py-2">{r.matchedBy === "pending" ? <MatchReviewButtons gameId={game.id} source={r.source} /> : <span className="text-xs text-slate-600">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ManualRefForm gameId={game.id} sources={SOURCES} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">정정 이력 <span className="text-sm font-normal text-slate-400">최근 {game.corrections.length}건</span></h2>
        {game.corrections.length === 0 ? (
          <p className="text-sm text-slate-400">정정 이력이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs text-slate-400">
                <tr>
                  <th className="px-3 py-2">일시</th>
                  <th className="px-3 py-2">대상</th>
                  <th className="px-3 py-2">필드</th>
                  <th className="px-3 py-2">이전</th>
                  <th className="px-3 py-2">이후</th>
                  <th className="px-3 py-2">잠금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {game.corrections.map((c) => {
                  const target = c.table === "games" ? "games" : `${c.table} · ${platformById.get(c.rowId) ? platformLabel(platformById.get(c.rowId) as PlatformRow) : c.rowId.slice(0, 8)}`;
                  return (
                    <tr key={c.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2">{formatDateTime(c.createdAt)}</td>
                      <td className="px-3 py-2 text-xs">{target}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.field}</td>
                      <td className="max-w-xs break-all px-3 py-2 text-xs text-slate-400">{jsonText(c.before)}</td>
                      <td className="max-w-xs break-all px-3 py-2 text-xs">{jsonText(c.after)}</td>
                      <td className="px-3 py-2 text-xs">{c.lockField ? "잠금" : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
