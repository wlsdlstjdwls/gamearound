// 업무 일정(WBS) 계산(2026-11-04). 화면(간트, 표)과 서비스가 같이 쓰는 순수 함수만 둔다 — 서버 전용이 아니다.
//
// 저장된 줄은 parent_id + sort_order 뿐이다. 번호(1.2.3), 깊이, 상위 줄의 기간과 진행률은 전부 여기서 매번 계산한다.
// 저장하지 않는 이유는 schema-plan 머리 주석: 줄 하나 옮길 때마다 아래 줄 전부를 고쳐 써야 하고 어긋나면 표가 거짓말을 한다.
import { shiftDay } from "@/lib/calendar";

/** 처음 깔린 파트(공통코드 PLAN_TRACK 의 시작값). 파트는 공통코드관리에서 더한다 — 이 셋은 코드북을 못 읽을 때의 기본값이다 */
export const PLAN_TRACKS = ["dev", "plan", "sales"] as const;
/** 파트 코드값. 공통코드에서 늘어나므로 글자다 */
export type PlanTrack = string;

export const PLAN_KINDS = ["task", "milestone"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/** 화면에 그리는 상태. 저장하지 않는다 — 날짜와 진행률에서 나온다 */
export const PLAN_STATES = ["todo", "doing", "late", "done"] as const;
export type PlanState = (typeof PLAN_STATES)[number];

/** 진행률 끝값. 이 값이면 끝난 일이다 */
export const PLAN_PROGRESS_MAX = 100;

/** 저장되는 줄 한 개(DTO). 날짜는 "YYYY-MM-DD" */
export type PlanItem = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  title: string;
  track: PlanTrack;
  kind: PlanKind;
  startOn: string | null;
  endOn: string | null;
  /** 손으로 적은 진행률. 비면 계산한다 */
  progress: number | null;
  assigneeId: string | null;
  memo: string | null;
};

/** 일정 줄에 이은 업무요청 카드. 걷은(지난 일) 카드도 센다 — 끝내고 걷었다고 진행률이 내려가면 안 된다 */
export type PlanCard = { id: string; title: string; status: "backlog" | "todo" | "doing" | "done"; planItemId: string; archived: boolean };

/** 일정 줄에 붙은 파일(업무요청 첨부 TaskAttachment 와 같은 모양 + 줄 열쇠) */
export type PlanAttachment = { id: string; planItemId: string; url: string; name: string; contentType: string; size: number };

/** 업무요청 팝업의 일정 고르기 칸 한 줄(번호 + 작업명) */
export type PlanOption = { id: string; label: string };

/** 카드 목록을 줄별 수로 */
export function countCards(cards: readonly PlanCard[]): Map<string, PlanCardCount> {
  const map = new Map<string, PlanCardCount>();
  for (const c of cards) {
    const n = map.get(c.planItemId) ?? { total: 0, done: 0 };
    n.total += 1;
    if (c.status === "done") n.done += 1;
    map.set(c.planItemId, n);
  }
  return map;
}

/** 줄에 이은 카드 수. done 은 끝 칸에 간 카드 */
export type PlanCardCount = { total: number; done: number };

/** 계산을 붙인 줄. 표와 간트가 이 순서(깊이 우선) 그대로 그린다 */
export type PlanRow = PlanItem & {
  /** WBS 번호(1, 1.2, 1.2.3) */
  no: string;
  depth: number;
  hasChildren: boolean;
  /** 그릴 기간. 하위가 있으면 하위의 처음과 끝이다 */
  start: string | null;
  end: string | null;
  /** 계산까지 마친 진행률(0~100) */
  pct: number;
  /** 진행률이 어디서 왔나. 화면이 "카드 3/5" 처럼 근거를 보인다 */
  pctFrom: "manual" | "cards" | "children" | "none";
  cards: PlanCardCount;
};

const byOrder = (a: PlanItem, b: PlanItem) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ko");

/** 상위 열쇠 → 하위 줄(순서대로). 상위가 목록에 없는 줄은 맨 위 줄로 친다 — 상위가 지워진 사이에 읽혀도 줄이 사라지지 않게 */
export function childrenMap(items: readonly PlanItem[]): Map<string | null, PlanItem[]> {
  const ids = new Set(items.map((i) => i.id));
  const map = new Map<string | null, PlanItem[]>();
  for (const it of items) {
    const p = it.parentId && ids.has(it.parentId) ? it.parentId : null;
    const list = map.get(p);
    if (list) list.push(it);
    else map.set(p, [it]);
  }
  for (const list of map.values()) list.sort(byOrder);
  return map;
}

/** 날 수(끝 날 포함). a 와 b 가 같으면 1 */
export function spanDays(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;
}

/** a 에서 b 까지 며칠 뒤인가(같으면 0, 앞이면 음수) */
export function dayOffset(a: string, b: string): number {
  return spanDays(a, b) - 1;
}

export { shiftDay };

const clampPct = (n: number) => Math.max(0, Math.min(PLAN_PROGRESS_MAX, Math.round(n)));

/**
 * 줄을 깊이 우선 순서로 펴고 번호, 기간, 진행률을 붙인다.
 * 상위의 진행률은 하위의 기간 가중 평균이다 — 하루짜리 회의와 한 달짜리 개발이 같은 무게면 상위 막대가 거짓말을 한다.
 * 이정표와 날짜 없는 줄은 하루 무게로 친다.
 */
export function buildPlanRows(items: readonly PlanItem[], cards: ReadonlyMap<string, PlanCardCount> = new Map()): PlanRow[] {
  const kids = childrenMap(items);
  const out: PlanRow[] = [];
  const seen = new Set<string>();

  const visit = (it: PlanItem, no: string, depth: number): PlanRow => {
    seen.add(it.id);
    const row: PlanRow = { ...it, no, depth, hasChildren: false, start: null, end: null, pct: 0, pctFrom: "none", cards: cards.get(it.id) ?? { total: 0, done: 0 } };
    out.push(row);
    // 순환(자기 하위를 상위로 둔 줄)이 들어와도 끝나게 이미 본 줄은 건너뛴다
    const children = (kids.get(it.id) ?? []).filter((c) => !seen.has(c.id));
    const sub = children.map((c, i) => visit(c, `${no}.${i + 1}`, depth + 1));
    row.hasChildren = sub.length > 0;

    if (row.hasChildren) {
      const starts = sub.map((s) => s.start).filter((v): v is string => !!v).sort();
      const ends = sub.map((s) => s.end).filter((v): v is string => !!v).sort();
      row.start = starts[0] ?? null;
      row.end = ends[ends.length - 1] ?? null;
    } else {
      row.start = it.startOn;
      row.end = it.kind === "milestone" ? it.startOn : (it.endOn ?? it.startOn);
    }

    if (it.progress != null) {
      row.pct = clampPct(it.progress);
      row.pctFrom = "manual";
    } else if (row.cards.total > 0) {
      row.pct = clampPct((row.cards.done / row.cards.total) * PLAN_PROGRESS_MAX);
      row.pctFrom = "cards";
    } else if (row.hasChildren) {
      const weight = (s: PlanRow) => (s.start && s.end ? Math.max(1, spanDays(s.start, s.end)) : 1);
      const total = sub.reduce((n, s) => n + weight(s), 0);
      row.pct = clampPct(sub.reduce((n, s) => n + s.pct * weight(s), 0) / total);
      row.pctFrom = "children";
    }
    return row;
  };

  (kids.get(null) ?? []).forEach((it, i) => visit(it, String(i + 1), 0));
  return out;
}

/** 상태: 끝(100%) > 지연(끝날 지남) > 진행(시작함) > 예정 */
export function planState(row: Pick<PlanRow, "start" | "end" | "pct">, today: string): PlanState {
  if (row.pct >= PLAN_PROGRESS_MAX) return "done";
  if (row.end && row.end < today) return "late";
  if (row.start && row.start <= today) return "doing";
  return "todo";
}

/** 줄과 그 아래 전부의 열쇠 */
export function descendantIds(items: readonly PlanItem[], id: string): Set<string> {
  const kids = childrenMap(items);
  const out = new Set<string>();
  const walk = (k: string) => {
    for (const c of kids.get(k) ?? []) {
      if (out.has(c.id)) continue;
      out.add(c.id);
      walk(c.id);
    }
  };
  walk(id);
  return out;
}

/** 형제 순서를 0, 1, 2 로 다시 매긴다. 바뀐 줄만 새 객체다 */
function renumber(items: PlanItem[], parentId: string | null, order: string[]): PlanItem[] {
  const pos = new Map(order.map((id, i) => [id, i]));
  return items.map((it) => {
    if ((it.parentId ?? null) !== parentId || !pos.has(it.id)) return it;
    const n = pos.get(it.id)!;
    return it.sortOrder === n ? it : { ...it, sortOrder: n };
  });
}

const siblingsOf = (items: readonly PlanItem[], parentId: string | null) => (childrenMap(items).get(parentId) ?? []).map((s) => s.id);

/** 형제 안에서 한 칸 위(-1)나 아래(+1)로. 끝이면 그대로 */
export function moveSibling(items: PlanItem[], id: string, by: -1 | 1): PlanItem[] {
  const it = items.find((i) => i.id === id);
  if (!it) return items;
  const order = siblingsOf(items, it.parentId);
  const at = order.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= order.length) return items;
  [order[at], order[to]] = [order[to]!, order[at]!];
  return renumber(items, it.parentId, order);
}

/** 들여쓰기: 바로 위 형제의 마지막 하위로. 위 형제가 없거나 이정표면 그대로 */
export function indent(items: PlanItem[], id: string): PlanItem[] {
  const it = items.find((i) => i.id === id);
  if (!it) return items;
  const order = siblingsOf(items, it.parentId);
  const at = order.indexOf(id);
  const prev = at > 0 ? items.find((i) => i.id === order[at - 1]) : undefined;
  if (!prev || prev.kind === "milestone") return items;
  const last = (childrenMap(items).get(prev.id) ?? []).length;
  const moved = items.map((i) => (i.id === id ? { ...i, parentId: prev.id, sortOrder: last } : i));
  return renumber(moved, it.parentId, order.filter((x) => x !== id));
}

/** 내어쓰기: 상위의 바로 다음 형제로. 맨 위 줄이면 그대로 */
export function outdent(items: PlanItem[], id: string): PlanItem[] {
  const it = items.find((i) => i.id === id);
  const parent = it?.parentId ? items.find((i) => i.id === it.parentId) : undefined;
  if (!it || !parent) return items;
  const outer = siblingsOf(items, parent.parentId);
  outer.splice(outer.indexOf(parent.id) + 1, 0, id);
  const moved = items.map((i) => (i.id === id ? { ...i, parentId: parent.parentId } : i));
  return renumber(renumber(moved, it.parentId, siblingsOf(items, it.parentId).filter((x) => x !== id)), parent.parentId, outer);
}

/** 새 줄의 자리: 고른 줄 바로 아래 형제. 고른 줄이 없으면 맨 끝 */
export function insertAfter(items: PlanItem[], fresh: PlanItem, afterId: string | null): PlanItem[] {
  const after = afterId ? items.find((i) => i.id === afterId) : undefined;
  const parentId = after ? after.parentId : null;
  const order = siblingsOf(items, parentId);
  order.splice(after ? order.indexOf(after.id) + 1 : order.length, 0, fresh.id);
  return renumber([...items, { ...fresh, parentId }], parentId, order);
}

/** 기간을 n 날 옮긴다(끌기). 이정표는 날 하나만 옮긴다 */
export function shiftItem(it: PlanItem, by: number): PlanItem {
  if (!by || !it.startOn) return it;
  return { ...it, startOn: shiftDay(it.startOn, by), endOn: it.kind === "milestone" ? shiftDay(it.startOn, by) : it.endOn ? shiftDay(it.endOn, by) : null };
}

/** 한쪽 끝만 옮긴다(늘이기, 줄이기). 시작이 끝을 넘지 못한다 */
export function resizeItem(it: PlanItem, edge: "start" | "end", by: number): PlanItem {
  if (!by || !it.startOn || it.kind === "milestone") return it;
  const end = it.endOn ?? it.startOn;
  if (edge === "start") {
    const next = shiftDay(it.startOn, by);
    return { ...it, startOn: next > end ? end : next };
  }
  const next = shiftDay(end, by);
  return { ...it, endOn: next < it.startOn ? it.startOn : next };
}

/** 갈래 하나의 요약(업무 별 진행률). 잎 줄만 센다 — 상위 줄은 하위의 합이라 같이 세면 두 번 센다 */
export type TrackSummary = { track: PlanTrack; pct: number; total: number; done: number; doing: number; late: number };

/** 파트별 요약. tracks 는 보일 파트 순서(공통코드 순서). 목록에 없지만 줄이 쓰는 파트(미사용으로 끈 것)도 뒤에 붙인다 */
export function trackSummaries(rows: readonly PlanRow[], today: string, tracks: readonly string[] = PLAN_TRACKS): TrackSummary[] {
  const all = [...tracks, ...new Set(rows.map((r) => r.track).filter((t) => !tracks.includes(t)))];
  return all.map((track) => {
    const leaves = rows.filter((r) => r.track === track && !r.hasChildren);
    const weight = (r: PlanRow) => (r.start && r.end ? spanDays(r.start, r.end) : 1);
    const total = leaves.reduce((n, r) => n + weight(r), 0);
    const states = leaves.map((r) => planState(r, today));
    return {
      track,
      pct: total ? clampPct(leaves.reduce((n, r) => n + r.pct * weight(r), 0) / total) : 0,
      total: leaves.length,
      done: states.filter((s) => s === "done").length,
      doing: states.filter((s) => s === "doing").length,
      late: states.filter((s) => s === "late").length,
    };
  });
}

/** 오늘부터 가장 가까운 안 끝난 이정표. 없으면 null */
export function nextMilestone(rows: readonly PlanRow[], today: string): PlanRow | null {
  return rows.filter((r) => r.kind === "milestone" && !r.hasChildren && r.start && r.start >= today && r.pct < PLAN_PROGRESS_MAX).sort((a, b) => a.start!.localeCompare(b.start!))[0] ?? null;
}

/** 담당자별 보기의 사람 머리 줄 열쇠 접두어. 일정 줄 열쇠(uuid)와 겹치지 않는다 — 고르기, 끌기는 이 줄을 건너뛴다 */
export const PERSON_ROW_PREFIX = "person:";

/** 담당을 비운 줄은 가장 가까운 상위의 담당을 물려받는다 — 묶음(개발)에 사람을 걸면 그 아래 작업이 다 그 사람 몫이 된다 */
export function effectiveAssignees(rows: readonly PlanRow[]): Map<string, string | null> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out = new Map<string, string | null>();
  const resolve = (r: PlanRow, guard = 0): string | null => {
    if (out.has(r.id)) return out.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : undefined;
    const v = r.assigneeId ?? (parent && guard < rows.length ? resolve(parent, guard + 1) : null);
    out.set(r.id, v);
    return v;
  };
  for (const r of rows) resolve(r);
  return out;
}

/** 담당자 한 사람의 몫(담당자별 보기). 잎 줄만 담고 시작일 순이다 */
/** doing: 진행, 지연 중인 작업. next: 아직 시작 전인 작업(시작일 순) — 하는 일이 없을 때 "다음 할 일" 로 보인다 */
export type PersonPlan = { assigneeId: string | null; rows: PlanRow[]; pct: number; start: string | null; end: string | null; doing: PlanRow[]; next: PlanRow[]; late: number; done: number };

export function groupByAssignee(rows: readonly PlanRow[], today: string, order: readonly string[] = []): PersonPlan[] {
  const who = effectiveAssignees(rows);
  const map = new Map<string | null, PlanRow[]>();
  for (const r of rows) {
    if (r.hasChildren) continue;
    const k = who.get(r.id) ?? null;
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  const weight = (r: PlanRow) => (r.start && r.end ? spanDays(r.start, r.end) : 1);
  const groups = [...map.entries()].map(([assigneeId, list]): PersonPlan => {
    const sorted = [...list].sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999") || a.no.localeCompare(b.no, "en", { numeric: true }));
    const total = sorted.reduce((n, r) => n + weight(r), 0);
    const starts = sorted.map((r) => r.start).filter((v): v is string => !!v).sort();
    const ends = sorted.map((r) => r.end).filter((v): v is string => !!v).sort();
    const states = sorted.map((r) => planState(r, today));
    return {
      assigneeId,
      rows: sorted,
      pct: total ? clampPct(sorted.reduce((n, r) => n + r.pct * weight(r), 0) / total) : 0,
      start: starts[0] ?? null,
      end: ends[ends.length - 1] ?? null,
      doing: sorted.filter((_, i) => states[i] === "doing" || states[i] === "late"),
      next: sorted.filter((_, i) => states[i] === "todo"),
      late: states.filter((s) => s === "late").length,
      done: states.filter((s) => s === "done").length,
    };
  });
  // 사람 순서는 담당자 목록 순서, 담당 없음은 맨 끝
  const rank = (id: string | null) => (id === null ? Number.MAX_SAFE_INTEGER : order.indexOf(id) < 0 ? order.length : order.indexOf(id));
  return groups.sort((a, b) => rank(a.assigneeId) - rank(b.assigneeId));
}

/**
 * 끌어 놓기로 순서 바꾸기: id 줄을 target 줄의 앞(before)이나 뒤(after) 형제로 옮긴다. 상위는 target 의 상위를 따른다.
 * 자기 하위 위로 놓으면(순환) 그대로 둔다.
 */
export function placeNear(items: PlanItem[], id: string, targetId: string, where: "before" | "after"): PlanItem[] {
  const it = items.find((i) => i.id === id);
  const target = items.find((i) => i.id === targetId);
  if (!it || !target || id === targetId || descendantIds(items, id).has(targetId)) return items;
  const parentId = target.parentId;
  const moved = items.map((i) => (i.id === id ? { ...i, parentId } : i));
  const order = siblingsOf(moved, parentId).filter((x) => x !== id);
  order.splice(order.indexOf(targetId) + (where === "after" ? 1 : 0), 0, id);
  const fromParent = it.parentId;
  const renumbered = renumber(moved, parentId, order);
  return fromParent === parentId ? renumbered : renumber(renumbered, fromParent, siblingsOf(renumbered, fromParent));
}

/** 끌어 놓기로 하위에 넣기: id 줄을 target 줄의 맨 끝 하위로. 이정표 안, 자기 하위 안으로는 못 간다 */
export function placeInside(items: PlanItem[], id: string, targetId: string): PlanItem[] {
  const it = items.find((i) => i.id === id);
  const target = items.find((i) => i.id === targetId);
  if (!it || !target || id === targetId || target.kind === "milestone" || descendantIds(items, id).has(targetId)) return items;
  const last = (childrenMap(items).get(targetId) ?? []).filter((c) => c.id !== id).length;
  const moved = items.map((i) => (i.id === id ? { ...i, parentId: targetId, sortOrder: last } : i));
  return renumber(moved, it.parentId, siblingsOf(moved, it.parentId));
}
