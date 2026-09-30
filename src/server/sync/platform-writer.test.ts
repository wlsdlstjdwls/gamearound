// 플랫폼 행 쓰기 계획 테스트 — 순수 함수만. DB 는 건드리지 않는다.
// 반영 규칙(§7)이 여기 다 모여 있다: null 로 덮지 않기, 잠긴 필드 건너뛰기,
// 값이 실제로 달라질 때만 UPDATE 하기, 할인이 끝나면 할인 메타는 지우기.
import { describe, expect, it } from "vitest";
import type { StoreSnapshot } from "@/server/adapters/types";
import type { Ctx } from "./context";
import { planPlatform, priceMisread, withSaneReleaseDate, type PlatformRow } from "./platform-writer";

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
    droppedPrices: 0,
    touched: new Map(),
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

describe("planPlatform - 스팀덱 등급과 네이티브 OS", () => {
  const runtime = { deckCompat: "verified" as const, nativeWindows: true, nativeMac: true, nativeLinux: false };

  // 2026-09-18 에 UPDATE 목록에만 더했다가 새 행이 전부 빈칸으로 들어갔다. 두 경로를 같이 본다
  it("새 행에도 값이 들어간다", () => {
    const plan = planPlatform(ctx(), undefined, "g-1", snapshot(runtime));
    expect(plan.kind).toBe("insert");
    if (plan.kind !== "insert") return;
    expect(plan.values.deckCompat).toBe("verified");
    expect(plan.values.nativeMac).toBe(true);
    expect(plan.values.nativeLinux).toBe(false);
  });

  it("기존 행도 갱신한다", () => {
    const plan = planPlatform(ctx(), row(), "g-1", snapshot(runtime));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.deckCompat).toBe("verified");
    expect(plan.set.nativeWindows).toBe(true);
  });

  // 밸브가 아직 안 본 게임은 null 로 온다. 아는 등급을 모름으로 내리면 안 된다(§7)
  it("null 은 기존 등급을 덮지 않는다", () => {
    const plan = planPlatform(ctx(), row({ deckCompat: "verified" } as Partial<PlatformRow>), "g-1", snapshot({ deckCompat: null }));
    expect(plan.kind === "update" && plan.set.deckCompat).toBeUndefined();
  });
});

describe("priceMisread - 정가가 있는데 값이 0 인 회차", () => {
  it("정가가 있는데 판매가가 0 이면 못 믿는다", () => {
    expect(priceMisread(snapshot({ listPrice: 46800, currentPrice: 0, discountPct: 100 }), null)).toBe(true);
  });

  it("이번 응답에 정가가 없어도 기존 행의 정가로 판정한다", () => {
    expect(priceMisread(snapshot({ listPrice: null, currentPrice: 0 }), 46800)).toBe(true);
  });

  it("정가도 0 이면 부분 무료 게임이다 - 그대로 받는다", () => {
    expect(priceMisread(snapshot({ listPrice: 0, currentPrice: 0 }), 0)).toBe(false);
  });

  it("값을 아예 안 주는 회차(null)는 이 규칙의 대상이 아니다", () => {
    expect(priceMisread(snapshot({ currentPrice: null }), 46800)).toBe(false);
  });
});

describe("planPlatform - 못 믿을 가격 회차", () => {
  const misreadSnap = snapshot({ listPrice: 46800, currentPrice: 0, discountPct: 100, discountName: "가을 할인", discountEndsAt: "2026-09-30T00:00:00.000Z" });

  it("기존 가격을 덮지 않고 스냅샷도 남기지 않는다", () => {
    const c = ctx();
    const existing = row({ listPrice: 46800, currentPrice: 11700, discountPct: 75 });
    const plan = planPlatform(c, existing, "g-1", misreadSnap);
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.listPrice).toBeUndefined();
    expect(plan.set.currentPrice).toBeUndefined();
    expect(plan.set.discountPct).toBeUndefined();
    expect(plan.snapshot).toBeNull();
    expect(plan.priceChange).toBeNull();
    expect(c.droppedPrices).toBe(1);
  });

  it("진행 중인 진짜 행사 정보를 지우지 않는다", () => {
    const existing = row({ currentPrice: 11700, discountPct: 75, discountName: "여름 할인", discountEndsAt: new Date("2026-09-20T00:00:00.000Z") });
    const plan = planPlatform(ctx(), existing, "g-1", misreadSnap);
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.discountName).toBeUndefined();
    expect(plan.set.discountEndsAt).toBeUndefined();
  });

  it("가격 말고 다른 필드는 그대로 반영한다", () => {
    const plan = planPlatform(ctx(), row({ currentVersion: null }), "g-1", snapshot({ listPrice: 46800, currentPrice: 0, discountPct: 100, currentVersion: "1.2.0" }));
    expect(plan.kind).toBe("update");
    if (plan.kind !== "update") return;
    expect(plan.set.currentVersion).toBe("1.2.0");
    expect(plan.changed).toBe(true);
  });

  it("새 행이면 가격 세 값을 비워 두고 다음 회차에 맡긴다", () => {
    const c = ctx();
    const plan = planPlatform(c, undefined, "g-1", misreadSnap);
    expect(plan.kind).toBe("insert");
    if (plan.kind !== "insert") return;
    expect(plan.values.listPrice).toBeNull();
    expect(plan.values.currentPrice).toBeNull();
    expect(plan.values.discountPct).toBeNull();
    expect(plan.values.discountName).toBeNull();
    expect(plan.snapshot).toBeNull();
    expect(c.droppedPrices).toBe(1);
  });
});

describe("출시일 소독", () => {
  // xbox 가 "미정" 을 9998년으로 준다(2026-09-16 실측 63건). 정렬과 집계가 그 줄에 끌려간다
  it("범위 밖 연도는 버린다", () => {
    expect(withSaneReleaseDate(snapshot({ releaseDate: "9998-12-31" })).releaseDate).toBeNull();
    expect(withSaneReleaseDate(snapshot({ releaseDate: "2799-01-01" })).releaseDate).toBeNull();
    expect(withSaneReleaseDate(snapshot({ releaseDate: "1969-12-31" })).releaseDate).toBeNull();
  });

  it("정상 범위는 그대로 둔다", () => {
    for (const d of ["1996-06-30", "2026-09-16", "2028-01-01"]) {
      expect(withSaneReleaseDate(snapshot({ releaseDate: d })).releaseDate).toBe(d);
    }
  });

  it("값이 없으면 스냅샷을 그대로 돌려준다", () => {
    const s = snapshot();
    expect(withSaneReleaseDate(s)).toBe(s);
  });

  // 버린 값이 null 로 흘러가면 PLATFORM_FIELDS 의 널 무시 규칙을 타 기존 값이 살아남아야 한다
  it("쓰레기 출시일이 기존 값을 덮지 않는다", () => {
    const plan = planPlatform(ctx(), row({ releaseDate: "2020-01-01" }), "g-1", snapshot({ releaseDate: "9998-12-31" }));
    if (plan.kind !== "update") throw new Error("update 여야 한다");
    expect(plan.set.releaseDate).toBeUndefined();
  });

  it("INSERT 에도 쓰레기 출시일이 들어가지 않는다", () => {
    const plan = planPlatform(ctx(), undefined, "g-1", snapshot({ releaseDate: "9998-12-31" }));
    if (plan.kind !== "insert") throw new Error("insert 여야 한다");
    expect(plan.values.releaseDate).toBeNull();
  });
});
