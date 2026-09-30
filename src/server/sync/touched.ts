// 한 번의 실행이 만진 게임과 그 게임에서 바뀐 값 — 수집 현황의 "가져온 게임" 시트가 읽는 기록.
//
// 왜 남기나(2026-09-30): 앞 화면은 소스마다 "방금 만진 게임 제목 셋" 을 띄웠다. 제목만으로는
// "무엇을 가져왔나" 가 안 보인다 — 가격이 바뀐 건지, 커버가 새로 붙은 건지, 확인만 하고 지나간 건지.
// 그 답은 반영 단계만 안다(무엇을 UPDATE 할지 계획하는 자리). 그래서 거기서 칸 이름을 모아
// sync_logs.items 에 실행 단위로 남긴다.
//
// 칸 이름은 DB 컬럼 키(camelCase) 그대로 담는다. 사람 말로 옮기는 일은 화면이 한다 — 여기서 옮기면
// 묶음 기준을 바꿀 때마다 옛 기록과 새 기록의 말이 달라진다.
//
// 하지 않기로 한 것: 바뀌기 전, 후 값은 담지 않는다. 가격 이력은 price_snapshots 에 이미 있고,
// 나머지 값까지 담으면 실행 한 줄이 수백 KB 가 된다. "무엇이 바뀌었나" 까지만 말한다.
import { PLATFORM_ROW_FIELD, UNKNOWN_FIELD } from "@/lib/sync-item-fields";
import { SYNC_LOG_ITEMS_MAX } from "./constants";

/** sync_logs.items 한 줄 */
export interface SyncLogItem {
  slug: string;
  /** 바뀐 칸(컬럼 키). 비었으면 가져와 견줬지만 달라진 것이 없다 */
  fields: string[];
  /** 이 실행이 게임 자체를 새로 만들었다 */
  created?: boolean;
}

/** 실행 동안 쌓는 모양. 같은 게임을 여러 단계가 만지므로 칸을 합친다 */
export type TouchedMap = Map<string, { fields: Set<string>; created: boolean }>;

/**
 * 플랫폼 행에 적는 칸 가운데 "바뀐 값" 이 아닌 것. 수집할 때마다 늘 적는 시각, 상태라
 * 이걸 세면 모든 게임이 매번 무언가 바뀐 것으로 보인다.
 */
const BOOKKEEPING_FIELDS = new Set(["lastSyncedAt", "syncStatus", "updatedAt"]);

export { PLATFORM_ROW_FIELD, UNKNOWN_FIELD };

export function noteTouched(map: TouchedMap, slug: string, fields: Iterable<string> = [], created = false): void {
  const cur = map.get(slug) ?? { fields: new Set<string>(), created: false };
  for (const f of fields) if (!BOOKKEEPING_FIELDS.has(f)) cur.fields.add(f);
  if (created) cur.created = true;
  map.set(slug, cur);
}

/**
 * 로그에 남길 줄. 반영 단계가 칸을 적지 않은 변경(changedSlugs 에만 있는 slug)도 빠뜨리지 않고
 * "기타" 로 싣는다 — 목록에서 빠지면 그 게임은 이 실행이 안 만진 것처럼 보인다.
 *
 * 상한을 넘으면 새로 만든 것, 바뀐 것, 확인만 한 것 순으로 남긴다. 사람이 먼저 봐야 할 줄이 앞이다.
 */
export function touchedForLog(map: TouchedMap, changedSlugs: Iterable<string>): SyncLogItem[] {
  for (const slug of changedSlugs) {
    const cur = map.get(slug);
    if (!cur || cur.fields.size === 0) noteTouched(map, slug, cur?.created ? [] : [UNKNOWN_FIELD]);
  }
  const rank = (it: SyncLogItem) => (it.created ? 0 : it.fields.length > 0 ? 1 : 2);
  return [...map.entries()]
    .map(([slug, v]): SyncLogItem => ({ slug, fields: [...v.fields], ...(v.created ? { created: true } : {}) }))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, SYNC_LOG_ITEMS_MAX);
}
