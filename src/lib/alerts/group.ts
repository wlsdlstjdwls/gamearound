// 가격 알림 목록을 게임 한 줄로 묶는다(기획서 v2.0 S-26, 목업 alv — 게임 하나에 플랫폼 칩 여럿).
//
// 저장은 플랫폼마다 한 행 그대로 둔다(services/alerts 의 saveGameAlert). 묶음은 보여 줄 때만 짓는다 —
// 발송, 7일 중복 방지, 발송 기록이 모두 행 단위라 저장 구조를 바꾸면 그쪽이 같이 흔들린다.
// 그래서 묶음 단위 조작(켜기/끄기, 지우기)도 행 액션을 묶음의 행마다 부르는 것으로 한다.
//
// 화면 타입(AlertView)을 직접 받지 않고 필요한 모양만 받는다 — lib 가 server 타입을 끌어오지 않게.

export type GroupableAlert = {
  id: string;
  game: { id: string };
  isActive: boolean;
  status: { met: boolean; best: unknown };
};

export type AlertGroup<T extends GroupableAlert> = {
  gameId: string;
  items: T[];
  /** 줄의 지금 상태와 미리보기를 맡을 대표 행 */
  lead: T;
  /** 하나라도 켜져 있으면 켜진 묶음이다 — 스위치는 "이 게임 알림이 살아 있나" 를 말한다 */
  isActive: boolean;
};

/**
 * 대표 행 고르기. 켜진 것 중 조건에 맞는 것 > 켜진 것 중 값을 아는 것 > 값을 아는 것 > 첫 행.
 * 꺼 둔 행이 "조건 충족" 을 세우면 오지 않을 알림을 약속하게 된다.
 */
function pickLead<T extends GroupableAlert>(items: T[]): T {
  return (
    items.find((v) => v.isActive && v.status.met) ??
    items.find((v) => v.isActive && v.status.best) ??
    items.find((v) => v.status.best) ??
    items[0]
  );
}

/** 게임별로 묶는다. 묶음 순서는 그 게임의 행이 처음 나온 자리, 묶음 안 순서는 들어온 순서 그대로다 */
export function groupAlertsByGame<T extends GroupableAlert>(views: T[]): AlertGroup<T>[] {
  const byGame = new Map<string, T[]>();
  for (const v of views) {
    const list = byGame.get(v.game.id);
    if (list) list.push(v);
    else byGame.set(v.game.id, [v]);
  }
  return [...byGame].map(([gameId, items]) => ({ gameId, items, lead: pickLead(items), isActive: items.some((v) => v.isActive) }));
}

/**
 * 묶음 스위치를 눌렀을 때 뒤집을 행. 토글 액션은 행을 뒤집기만 하므로, 이미 목표 상태인 행은 건드리지 않는다 —
 * 일부만 켜진 묶음을 끄면 켜진 행만, 다 꺼진 묶음을 켜면 전부를 뒤집는다.
 */
export function toggleTargets(items: Array<Pick<GroupableAlert, "id" | "isActive">>, nextActive: boolean): string[] {
  return items.filter((v) => v.isActive !== nextActive).map((v) => v.id);
}

/** 같은 값은 한 번만, 처음 나온 순서대로. 묶음의 조건 글, 받는 방법을 한 줄에 적을 때 쓴다 */
export function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}
