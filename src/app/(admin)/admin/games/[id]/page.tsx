// /admin/games/[id] — 게임 고치기: 데이터 정정(§4.4), 소스 매핑(§4.2), 검색 별칭, 세대 업그레이드, 정정 이력.
// 화면 구성은 백오피스 꼴(components/admin/game-screen, 2026-10-30). 여기는 DB 행을 화면 꼴(game-screen/types)로 옮겨 넘기기만 한다 —
// 날짜, 금액, 이름표는 여기서 글자로 만든다(화면이 시계, 통화 규칙을 다시 들지 않게).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { GameScreen } from "@/components/admin/game-screen";
import type { FieldRow, GameScreenData } from "@/components/admin/game-screen/types";
import { GAME_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import { codeName } from "@/lib/codes/book";
import { getCodeBook } from "@/server/services/common-codes";
import { formatPrice } from "@/lib/currency";
import { formatDateTime, PLATFORM_LABEL } from "@/lib/format";
import { sourceLabel } from "@/lib/source-label";
import { gamePath } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { platformEnum, upgradeKindEnum } from "@/server/db/schema";
import { CORRECTABLE_FIELDS, getGameForAdmin, SOURCES } from "@/server/services/admin";
import { listAliases } from "@/server/services/admin-aliases";
import { listUpgrades } from "@/server/services/admin-upgrades";

export const metadata: Metadata = { title: M.title };

type GameRow = NonNullable<Awaited<ReturnType<typeof getGameForAdmin>>>;
type PlatformDbRow = GameRow["platforms"][number];
type GameField = keyof typeof CORRECTABLE_FIELDS.games;
type PlatformField = keyof typeof CORRECTABLE_FIELDS.game_platforms;

// 화이트리스트(DB 컬럼명) → 현재값 추출
const GAME_GETTER: Record<GameField, (g: GameRow) => FieldRow["current"]> = {
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
const PLATFORM_GETTER: Record<PlatformField, (p: PlatformDbRow) => FieldRow["current"]> = {
  list_price: (p) => p.listPrice,
  current_price: (p) => p.currentPrice,
  discount_pct: (p) => p.discountPct,
  current_version: (p) => p.currentVersion,
  release_date: (p) => p.releaseDate,
  metacritic_score: (p) => p.metacriticScore,
  opencritic_score: (p) => p.opencriticScore,
};

const platformName = (p: PlatformDbRow) => PLATFORM_LABEL[p.platform] ?? p.platform;

function fieldRows(g: GameRow): FieldRow[] {
  const games = (Object.keys(CORRECTABLE_FIELDS.games) as GameField[]).map((name) => ({
    key: `games:${g.id}:${name}`,
    table: "games" as const,
    rowId: g.id,
    target: M.targetGame,
    field: name,
    label: CORRECTABLE_FIELDS.games[name].label,
    kind: CORRECTABLE_FIELDS.games[name].kind,
    current: GAME_GETTER[name](g),
  }));
  const platforms = g.platforms.flatMap((p) =>
    (Object.keys(CORRECTABLE_FIELDS.game_platforms) as PlatformField[]).map((name) => ({
      key: `game_platforms:${p.id}:${name}`,
      table: "game_platforms" as const,
      rowId: p.id,
      target: platformName(p),
      field: name,
      label: CORRECTABLE_FIELDS.game_platforms[name].label,
      kind: CORRECTABLE_FIELDS.game_platforms[name].kind,
      current: PLATFORM_GETTER[name](p),
    })),
  );
  return [...games, ...platforms];
}

function jsonText(v: unknown): string {
  if (v === null || v === undefined) return M.none;
  return typeof v === "string" ? v : JSON.stringify(v);
}

/** 고친 기록의 칸 이름 — 컬럼명 대신 고칠 때 본 이름표. 화이트리스트에서 빠진 옛 칸은 컬럼명 그대로 */
function fieldLabel(table: string, field: string): string {
  const specs = (CORRECTABLE_FIELDS as Record<string, Record<string, { label: string }>>)[table];
  return specs?.[field]?.label ?? field;
}

export default async function AdminGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRoleOrForbid("admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const game = await getGameForAdmin(id);
  if (!game) notFound();
  const [upgradeRows, aliasRows, book] = await Promise.all([listUpgrades(game.id), listAliases(game.id), getCodeBook()]);
  const platformById = new Map(game.platforms.map((p) => [p.id, p]));

  const data: GameScreenData = {
    game: { id: game.id, slug: game.slug, title: game.titleKo ?? game.titleEn, titleEn: game.titleEn, publicHref: gamePath(game.slug) },
    fields: fieldRows(game),
    platforms: game.platforms.map((p) => ({
      id: p.id,
      label: platformName(p),
      currentPrice: formatPrice(p.currentPrice, p.currency),
      listPrice: formatPrice(p.listPrice, p.currency),
      lastSynced: formatDateTime(p.lastSyncedAt),
      status: p.syncStatus ? codeName(book, "SYNC_STATUS", p.syncStatus) : "-",
    })),
    refs: game.sourceRefs.map((r) => ({ source: r.source, sourceLabel: sourceLabel(r.source), externalId: r.externalId, url: r.url, matchedBy: r.matchedBy, confidence: r.confidence })),
    aliases: aliasRows.map((a) => ({ id: a.id, alias: a.alias })),
    upgrades: upgradeRows.map((u) => ({ id: u.id, fromPlatform: u.fromPlatform, toPlatform: u.toPlatform, kind: u.kind, price: u.price, storeUrl: u.storeUrl, note: u.note })),
    history: game.corrections.map((c) => {
      const p = c.table === "game_platforms" ? platformById.get(c.rowId) : undefined;
      return {
        id: String(c.id),
        when: formatDateTime(c.createdAt),
        target: c.table === "games" ? M.targetGame : p ? platformName(p) : c.rowId.slice(0, 8),
        field: fieldLabel(c.table, c.field),
        before: jsonText(c.before),
        after: jsonText(c.after),
        locked: Boolean(c.lockField),
      };
    }),
    sources: SOURCES,
    platformOptions: platformEnum.enumValues,
    kinds: upgradeKindEnum.enumValues,
  };

  return <GameScreen data={data} />;
}
