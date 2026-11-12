// 게임 이벤트, 소식 카드 수집 진입점 — 출처마다 따로 돌고 한쪽이 실패해도 다른 쪽은 간다.
// 담는 것은 공유 태그와 링크뿐이다(schema-game-events 머리 주석).
import { GAME_EVENTS_PAGES_DEFAULT, GAME_EVENTS_PAGES_MAX } from "@/server/sync/constants";
import { collectNintendoEvents } from "./nintendo";
import { collectSteamEvents } from "./steam";
import { newPart, type EventRunPart } from "./types";

export type GameEventsSource = "nintendo" | "steam";
export type GameEventsResult = Record<GameEventsSource, Omit<EventRunPart, "fail"> | null>;

export async function runGameEvents(opts: { pages?: number; sources?: GameEventsSource[]; steamLimit?: number } = {}): Promise<GameEventsResult> {
  const pages = Math.min(Math.max(1, opts.pages ?? GAME_EVENTS_PAGES_DEFAULT), GAME_EVENTS_PAGES_MAX);
  const sources = opts.sources ?? ["nintendo", "steam"];
  const result: GameEventsResult = { nintendo: null, steam: null };
  const strip = (p: EventRunPart): Omit<EventRunPart, "fail"> => ({ candidates: p.candidates, written: p.written, skipped: p.skipped, failed: p.failed, errors: p.errors });

  if (sources.includes("nintendo")) {
    const part = newPart();
    try {
      await collectNintendoEvents(pages, part);
    } catch (e) {
      part.fail("nintendo", e);
    }
    result.nintendo = strip(part);
  }
  if (sources.includes("steam")) {
    const part = newPart();
    try {
      await collectSteamEvents(new Date(), part, opts.steamLimit);
    } catch (e) {
      part.fail("steam", e);
    }
    result.steam = strip(part);
  }
  return result;
}
