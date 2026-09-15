// 플랫폼 행 쓰기 계획 테스트 — 순수 함수만. DB 는 건드리지 않는다.
// 반영 규칙(§7)이 여기 다 모여 있다: null 로 덮지 않기, 잠긴 필드 건너뛰기,
// 값이 실제로 달라질 때만 UPDATE 하기, 할인이 끝나면 할인 메타는 지우기.
import { describe, expect, it } from "vitest";
import type { StoreSnapshot } from "@/server/adapters/types";
import type { Ctx } from "./context";
import { planPlatform, type PlatformRow } from "./platform-writer";

const NOW = new Date("2026-09-14T00:00:00.000Z");

function ctx(locks: string[] = []): Ctx {
  return {
    db: null as unknown as Ctx["db"],
    source: "steam",
    now: NOW,
    locks: new Set(locks),
    processed: 0,
    failed: 0,
    errors: [],
    changedSlugs: new Set(),
    changedCompanySlugs: new Set(),
    priceChanges: [],
  };
}

function snapshot(over: Partial<StoreSnapshot> = {}): StoreSnapshot {
  return {
    platform: "steam",
    storeExternalId: "1245620",
    storeUrl: "https://store.steampowered.com/app/1245620",
    listPrice: 64800,
    currentPrice: 64800,
    discountPct: 0,
    ...over,
  };
}

function row(over: Partial<PlatformRow> = {}): PlatformRow {
  return {
    id: "gp-1",
    gameId: "g-1",
    platform: "steam",
    storeExternalId: "1245620",
    storeUrl: "https://store.steampowered.com/app/1245620",
    releaseDate: null,
    currentVersion: null,
    listPrice: 64800,
    currentPrice: 64800,
    discountPct: 0,
    discountStartsAt: null,
    discountEndsAt: null,
    discountName: null,
    hasAddOns: null,
    lastSyncedAt: null,
    syncStatus: "ok",
    ...over,
  } as PlatformRow;
}

describe("planPlatform - 유저 점수", () => {
  const score = { value: 94, kind: "positive_ratio", count: 487684 } as const;

  it("세 값을 함께 쓴다 — 점수만 바뀌고 척도가 남으면 뜻이 뒤집힌다", () => {
    const plan = planPlatform(ctx(), row(), "g-1", snapshot({ userScore: { ...score } }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.userScore).toBe(94);
    expect(plan.set.userScoreKind).toBe("positive_ratio");
    expect(plan.set.userScoreCount).toBe(487684);
    expect(plan.changed).toBe(true);
  });

  it("스토어가 점수를 안 주면 이미 있는 값을 지우지 않는다(§7)", () => {
    const existing = row({ userScore: 94, userScoreKind: "positive_ratio", userScoreCount: 487684 });
    const plan = planPlatform(ctx(), existing, "g-1", snapshot());
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.userScore).toBeUndefined();
    expect(plan.changed).toBe(false);
  });

  it("값이 그대로면 UPDATE 하지 않는다 — 리뷰 수는 매번 조금씩 늘어 캐시를 헛되이 깬다", () => {
    const existing = row({ userScore: 94, userScoreKind: "positive_ratio", userScoreCount: 487684 });
    const plan = planPlatform(ctx(), existing, "g-1", snapshot({ userScore: { ...score } }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.userScore).toBeUndefined();
    expect(plan.changed).toBe(false);
  });

  it("관리자가 잠근 점수는 건드리지 않는다", () => {
    const existing = row({ userScore: 50, userScoreKind: "positive_ratio", userScoreCount: 10 });
    const plan = planPlatform(ctx(["game_platforms:gp-1:user_score"]), existing, "g-1", snapshot({ userScore: { ...score } }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.userScore).toBeUndefined();
  });
});

describe("planPlatform", () => {
  it("기존 행이 없으면 INSERT 계획 + 첫 가격 스냅샷", () => {
    const plan = planPlatform(ctx(), undefined, "g-1", snapshot());
    expect(plan.kind).toBe("insert");
    if (plan.kind !== "insert") return;
    expect(plan.values.gameId).toBe("g-1");
    expect(plan.values.currentPrice).toBe(64800);
    expect(plan.snapshot?.price).toBe(64800);
  });

  it("가격을 못 받은 신규 행은 스냅샷을 남기지 않는다", () => {
    const plan = planPlatform(ctx(), undefined, "g-1", snapshot({ currentPrice: null, listPrice: null, discountPct: null }));
    expect(plan.kind).toBe("insert");
    if (plan.kind !== "insert") return;
    expect(plan.snapshot).toBeNull();
  });

  it("값이 그대로면 changed=false, 스냅샷도 없다", () => {
    const plan = planPlatform(ctx(), row(), "g-1", snapshot());
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.changed).toBe(false);
    expect(plan.snapshot).toBeNull();
    // lastSyncedAt, syncStatus 는 항상 쓴다 — 신선도 표시가 이 값을 본다
    expect(plan.set.lastSyncedAt).toBe(NOW);
  });

  it("가격이 바뀌면 스냅샷과 가격 변동을 함께 남긴다", () => {
    const plan = planPlatform(ctx(), row(), "g-1", snapshot({ currentPrice: 32400, discountPct: 50 }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.changed).toBe(true);
    expect(plan.snapshot?.price).toBe(32400);
    expect(plan.priceChange).toEqual({ previousPrice: 64800, newPrice: 32400 });
  });

  it("외부 값이 null 이면 기존 값을 덮지 않는다", () => {
    const plan = planPlatform(ctx(), row({ currentPrice: 64800 }), "g-1", snapshot({ currentPrice: null }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.currentPrice).toBeUndefined();
    expect(plan.changed).toBe(false);
  });

  it("잠긴 필드는 건드리지 않는다", () => {
    const locked = ctx(["game_platforms:gp-1:current_price"]);
    const plan = planPlatform(locked, row(), "g-1", snapshot({ currentPrice: 32400 }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.currentPrice).toBeUndefined();
  });

  it("할인이 끝나면 할인 메타 세 값을 null 로 지운다", () => {
    const existing = row({
      currentPrice: 32400,
      discountPct: 50,
      discountEndsAt: new Date("2026-09-20T00:00:00.000Z"),
      discountName: "가을 할인",
    });
    const plan = planPlatform(ctx(), existing, "g-1", snapshot({ currentPrice: 64800, discountPct: 0 }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.discountEndsAt).toBeNull();
    expect(plan.set.discountName).toBeNull();
    expect(plan.changed).toBe(true);
  });
});
