// 화면 툴바 "엑셀"(screen/head)이 그리드의 전체 줄을 받아 가는 자리.
// 그리드는 쪽을 나눠 지금 쪽만 그린다 — 화면 글자(DOM)를 읽으면 다른 쪽 줄이 빠진다. 그래서 그리드가 자기 데이터를 여기 걸어 두고
// 엑셀은 걸린 그리드가 있으면 그것을, 없으면 화면의 data-grid 표시(data-rows)를 읽는다.

export type GridDump = { label: string; head: string[]; rows: string[][] };
const providers = new Map<string, () => GridDump>();

export function registerGrid(id: string, dump: () => GridDump): () => void {
  providers.set(id, dump);
  return () => {
    providers.delete(id);
  };
}

/** 걸린 그리드들의 데이터. 화면에 그리드가 둘이면 둘 다 — 엑셀은 첫 번째(주 목록)를 쓴다 */
export function registeredGrids(): GridDump[] {
  return [...providers.values()].map((f) => f());
}
