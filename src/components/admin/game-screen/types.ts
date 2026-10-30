// 게임 고치기 화면이 받는 값 꼴. 페이지(서버)가 DB 행을 이 꼴로 옮겨 넘긴다 — 스키마가 바뀌어도 화면 계약은 그대로다(AGENTS §1).
// 날짜, 금액은 서버에서 글자로 만들어 넘긴다: 화면이 Date.now() 나 통화 규칙을 다시 들고 있지 않게.
import type { Platform, UpgradeKind } from "@/server/db/schema";

export type FieldKind = "text" | "int" | "bool" | "date";

export type GameSummary = { id: string; slug: string; title: string; titleEn: string; publicHref: string };

/** 고칠 수 있는 칸 하나. key = table:rowId:field */
export type FieldRow = {
  key: string;
  table: "games" | "game_platforms";
  rowId: string;
  target: string;
  field: string;
  label: string;
  kind: FieldKind;
  current: string | number | boolean | null;
};

export type PlatformRow = { id: string; label: string; currentPrice: string; listPrice: string; lastSynced: string; status: string };

export type RefRow = { source: string; sourceLabel: string; externalId: string; url: string | null; matchedBy: string; confidence: string | null };

export type AliasRow = { id: number; alias: string };

export type UpgradeRow = { id: number; fromPlatform: Platform; toPlatform: Platform; kind: UpgradeKind; price: number | null; storeUrl: string | null; note: string | null };

export type HistoryRow = { id: string; when: string; target: string; field: string; before: string; after: string; locked: boolean };

export type GameScreenData = {
  game: GameSummary;
  fields: FieldRow[];
  platforms: PlatformRow[];
  refs: RefRow[];
  aliases: AliasRow[];
  upgrades: UpgradeRow[];
  history: HistoryRow[];
  sources: readonly string[];
  platformOptions: readonly Platform[];
  kinds: readonly UpgradeKind[];
};
