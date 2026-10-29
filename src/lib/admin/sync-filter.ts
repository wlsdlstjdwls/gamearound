// 수집현황, 수집이력조회의 조회조건(스토어, 상태) 주소 다루기. 두 화면이 같은 꼴이라 한곳에 둔다(AGENTS §3).
//
// 두 칸을 "스토어|상태" 한 값으로 쥐는 이유: useUrlFilter 를 칸마다 따로 쥐면 하나를 고르고 서버가 답하기 전에
// 다른 하나를 고를 때 둘째 주소가 아직 옛 첫째 값으로 만들어져 앞 고름이 빠진다. 한 값이면 둘이 같이 낙관 갱신된다.
// "all" 은 주소에 싣지 않는다 — 조건 없는 주소가 메뉴 주소와 같아야 프로그램 탭이 같은 화면으로 읽는다.

export const SYNC_FILTER_ALL = "all";

export function joinSyncFilter(source: string, status: string): string {
  return `${source}|${status}`;
}

export function splitSyncFilter(v: string): [source: string, status: string] {
  const [source, status] = v.split("|");
  return [source || SYNC_FILTER_ALL, status || SYNC_FILTER_ALL];
}

export function syncFilterHref(base: string, joined: string): string {
  const [source, status] = splitSyncFilter(joined);
  const p = new URLSearchParams();
  if (source !== SYNC_FILTER_ALL) p.set("source", source);
  if (status !== SYNC_FILTER_ALL) p.set("status", status);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}
