// 코드북 — 코드 기본값(lib/codes/registry)에 공통코드관리에서 고친 값(DB)을 덮은 결과(2026-10-30).
// 서버(services/common-codes 의 getCodeBook)가 캐시해 만들고, 클라이언트는 루트 레이아웃이 내려 준 것을 쓴다(components/code-book).
// 순수 함수만 둔다 — 서버, 클라이언트, 테스트가 같은 규칙으로 이름표를 찾는다.
import { CODE_REGISTRY, type RegistryGroup } from "./registry";

export type CodeEntry = { code: string; name: string; sortOrder: number; active: boolean };
/** 그룹코드 → 코드 줄(정렬순서대로). DB 에 고친 값이 있는 그룹만이 아니라 등록된 그룹 전부가 든다 */
export type CodeBook = Record<string, CodeEntry[]>;
/** DB 에서 읽은 덮어쓸 값. 그룹이 미사용이면 groupActive=false */
export type CodeOverride = { groupCode: string; groupActive: boolean; code: string; name: string; sortOrder: number; active: boolean };

/** 기본값 정렬순서 간격. 공통코드 새 줄(SORT_STEP)과 같은 10 — 사이에 끼워 넣을 자리가 남는다 */
const DEFAULT_SORT_STEP = 10;

export function defaultEntries(group: RegistryGroup): CodeEntry[] {
  return Object.entries(CODE_REGISTRY[group].defaults).map(([code, name], i) => ({ code, name, sortOrder: (i + 1) * DEFAULT_SORT_STEP, active: true }));
}

/**
 * 기본값 위에 DB 값을 덮는다. 잠긴 그룹(등록 그룹)은 기본값에 없는 코드를 버린다 — DB enum 이 받지 못하는 코드다.
 * 등록되지 않은 그룹(공통코드관리에서 만든 NOTIFY_CHANNEL 같은 것)은 DB 줄이 곧 전부다.
 * 그룹이 미사용이면 그 그룹의 덮어쓴 값은 버린다(기본값으로 선다) — 그룹을 끄는 것이 "운영 값 걷기" 로 읽히게.
 */
export function buildCodeBook(overrides: readonly CodeOverride[]): CodeBook {
  const book: CodeBook = {};
  for (const g of Object.keys(CODE_REGISTRY) as RegistryGroup[]) book[g] = defaultEntries(g);
  for (const o of overrides) {
    if (!o.groupActive) continue;
    const list = (book[o.groupCode] ??= []);
    const at = list.findIndex((e) => e.code === o.code);
    const entry = { code: o.code, name: o.name, sortOrder: o.sortOrder, active: o.active };
    if (at >= 0) list[at] = entry;
    else if (!(o.groupCode in CODE_REGISTRY)) list.push(entry);
  }
  for (const list of Object.values(book)) list.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  return book;
}

/** 이름표. 모르는 코드면 코드 글자 그대로(DB 에 새 enum 값이 먼저 들어온 경우 등) */
export function codeName(book: CodeBook, group: string, code: string): string {
  return book[group]?.find((e) => e.code === code)?.name ?? code;
}

/** 고르기 칸 보기. 사용여부가 켜진 코드만, 정렬순서대로 */
export function codeOptions(book: CodeBook, group: string): Array<{ value: string; label: string }> {
  return (book[group] ?? []).filter((e) => e.active).map((e) => ({ value: e.code, label: e.name }));
}

/** 그룹의 코드를 이름표 객체로(기존 이름표 객체를 받던 부품에 그대로 넘길 때) */
export function codeMap(book: CodeBook, group: string): Record<string, string> {
  return Object.fromEntries((book[group] ?? []).map((e) => [e.code, e.name]));
}
