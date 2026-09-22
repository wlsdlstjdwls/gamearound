// 화면 질의에서 숨긴 플랫폼 행을 빼는 조건 한 곳.
//
// 왜 조건을 상수로 빼나: game_platforms 를 읽는 자리가 목록, 홈, 상세, 가격, 패치, 회사, 검색으로
// 흩어져 있다. 각 질의가 제 손으로 "이 스토어만 뺀다" 를 쓰면 한 곳을 빠뜨렸을 때 그 화면에서만
// 숨긴 스토어가 되살아난다 — 그 한 곳이 어디인지는 아무도 모른다.
//
// 무엇을 숨길지는 lib/platform 의 HIDDEN_PLATFORMS 가 정한다. 여기는 그걸 SQL 로 옮기기만 한다.
import { and, isNotNull, notInArray, type SQL } from "drizzle-orm";
import { HIDDEN_PLATFORMS, HIDDEN_REGIONS } from "@/lib/platform";
import { gamePlatforms } from "./schema";

/**
 * game_platforms 를 읽는 **화면 질의**에 끼우는 조건. 숨긴 것이 없으면 undefined 라
 * drizzle 의 and(...) 에 그대로 넘겨도 아무 일도 하지 않는다.
 *
 * 수집(sync)과 관리자 화면은 이걸 쓰지 않는다 — 숨긴 행도 그대로 있고, 관리자는 그 사실을 봐야 한다.
 */
export function visiblePlatformsOnly(): SQL | undefined {
  const conds: SQL[] = [linkedOnly()];
  if (HIDDEN_PLATFORMS.length > 0) conds.push(notInArray(gamePlatforms.platform, HIDDEN_PLATFORMS));
  // 지역도 같은 자리에서 거른다 — 숨긴 나라의 행이 화면 질의마다 따로 걸러지면 한 곳을 빠뜨린다
  if (HIDDEN_REGIONS.length > 0) conds.push(notInArray(gamePlatforms.region, HIDDEN_REGIONS));
  return conds.length === 0 ? undefined : and(...conds);
}

/**
 * **스토어 링크가 있는 행만 화면에 세운다**(2026-09-22, 사용자가 잡아낸 값).
 *
 * 무슨 일이 있었나: 프라그마타의 스위치 2 줄이 ₩11,320 을 달고 있었다. 스토어에 가 보면 ₩55,840(정가 ₩69,800)이고,
 * 그 줄에는 링크도 없었다. 실측해 보니 링크 없는 행이 **60,112개**인데 전부 한 시각에 만들어져 있다
 * (2026-09-15 06:04:12.468, created_source = system = psprices 병합분). 크롤러가 만든 행은 늘 링크를 갖는다 —
 * 그 하루를 빼면 링크 없는 행이 **0개**다. 즉 링크 유무가 곧 "우리가 스토어에서 직접 본 값인가" 다.
 *
 * 그 행들은 ref 가 없어 크론이 다시 찾아가지 않는다. 고칠 방법이 없는 값이 화면에서 최저가 행세를 한다.
 * 지우지 않고 거르는 이유는 psprices 잔재를 다룰 때와 같다 — 매칭이 붙는 순간 링크가 생기고 스스로 돌아온다.
 *
 * 손실은 재어 봤다: 보이는 게임 14,578개 중 한국 행을 가진 것이 13,761개, 그중 링크 있는 행을 가진 것이 13,551개다.
 * 210개(1.5%)가 값 없는 화면이 되는데, 그 값들은 애초에 확인할 수 없는 값이었다.
 */
function linkedOnly(): SQL {
  return isNotNull(gamePlatforms.storeUrl);
}

/**
 * 이미 읽어 온 행 목록에서 숨긴 플랫폼, 숨긴 지역, 링크 없는 행을 걸러낸다 — 관계형 조회(with: { platforms: true })용.
 * region 을 선택 속성으로 받는 이유: 지역을 안 읽어 온 자리도 이 함수를 쓴다(그때는 플랫폼만 본다).
 */
export function keepVisiblePlatforms<T extends { platform: string; region?: string; storeUrl?: string | null }>(rows: T[]): T[] {
  return rows.filter(
    (r) =>
      !HIDDEN_PLATFORMS.includes(r.platform as never) &&
      !(r.region !== undefined && HIDDEN_REGIONS.includes(r.region as never)) &&
      // storeUrl 을 안 읽어 온 자리(선택 속성)는 링크로 거르지 않는다 — 읽어 온 자리만 판단한다
      !(r.storeUrl !== undefined && r.storeUrl === null),
  );
}
