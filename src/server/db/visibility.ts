// 화면 질의에서 숨긴 플랫폼 행을 빼는 조건 한 곳.
//
// 왜 조건을 상수로 빼나: game_platforms 를 읽는 자리가 목록, 홈, 상세, 가격, 패치, 회사, 검색으로
// 흩어져 있다. 각 질의가 제 손으로 "gog 만 뺀다" 를 쓰면 한 곳을 빠뜨렸을 때 그 화면에서만
// 숨긴 스토어가 되살아난다 — 그 한 곳이 어디인지는 아무도 모른다.
//
// 무엇을 숨길지는 lib/platform 의 HIDDEN_PLATFORMS 가 정한다. 여기는 그걸 SQL 로 옮기기만 한다.
import { notInArray } from "drizzle-orm";
import { HIDDEN_PLATFORMS } from "@/lib/platform";
import { gamePlatforms } from "./schema";

/**
 * game_platforms 를 읽는 **화면 질의**에 끼우는 조건. 숨긴 것이 없으면 undefined 라
 * drizzle 의 and(...) 에 그대로 넘겨도 아무 일도 하지 않는다.
 *
 * 수집(sync)과 관리자 화면은 이걸 쓰지 않는다 — 숨긴 행도 그대로 있고, 관리자는 그 사실을 봐야 한다.
 */
export function visiblePlatformsOnly() {
  return HIDDEN_PLATFORMS.length === 0 ? undefined : notInArray(gamePlatforms.platform, HIDDEN_PLATFORMS);
}

/** 이미 읽어 온 행 목록에서 숨긴 플랫폼을 걸러낸다 — 관계형 조회(with: { platforms: true })용 */
export function keepVisiblePlatforms<T extends { platform: string }>(rows: T[]): T[] {
  return HIDDEN_PLATFORMS.length === 0 ? rows : rows.filter((r) => !HIDDEN_PLATFORMS.includes(r.platform as never));
}
