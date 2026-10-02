// 목록, 검색이 공유하는 조건 조각이 실제로 어떤 SQL 과 바인딩을 만드는지 고정한다.
// DB 없이 검증하려고 드리즐 방언으로 렌더만 한다 — 이 파일은 네트워크, DB 를 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { hasVisiblePlatform, mainGamesOnly, runsOnRig } from "./filters";
import { HIDDEN_PLATFORMS, HIDDEN_REGIONS } from "@/lib/platform";
import { showcaseReady } from "./exposure";

const dialect = new PgDialect();
const render = (q: SQL<unknown>) => dialect.sqlToQuery(q);

describe("hasVisiblePlatform", () => {
  // 2026-09-22 에 뒤집힌 규칙이다. 전에는 "지역을 보지 않는다" 가 이 조건의 존재 이유였는데
  // (한국 행이 없는 일본 전용 게임도 검색으로는 찾게 하려던 자리) 일본을 통째로 내리면서
  // 숨긴 지역만 가진 게임은 검색에서도 빠지는 것이 맞게 됐다. 나라 이름을 박아 두지 않는 이유는
  // 스토어 이름을 안 박는 이유와 같다 — 목록이 비면 조건도 서지 않는 것이 맞다
  it("숨긴 지역은 조건에 들어가고, 숨긴 것이 없으면 안 들어간다", () => {
    const { sql: text } = render(hasVisiblePlatform([]));
    if (HIDDEN_REGIONS.length > 0) expect(text).toContain("region");
    else expect(text).not.toContain("region");
  });

  it("그 게임의 행만 본다 (상관 조건)", () => {
    const { sql: text } = render(hasVisiblePlatform([]));
    expect(text).toContain("exists");
    expect(text).toContain('"game_platforms"."game_id" = "games"."id"');
  });

  // 특정 스토어 이름을 박아 두지 않는다(2026-09-18) — 숨김 목록이 비면 조건 자체가 서지 않는 것이 맞다.
  // 전에는 "not in 이 있다" 로 단정해 뒀는데, 목록이 빈 순간 규칙이 멀쩡한데도 테스트가 깨졌다
  it("숨긴 스토어, 숨긴 지역은 값마다 자리표시자로 빠진다", () => {
    const { sql: text, params } = render(hasVisiblePlatform([]));
    // 배열을 통째로 넘기면 자리표시자 하나에 배열이 묶여 조건이 조용히 어긋난다
    expect(params).toEqual([...HIDDEN_PLATFORMS, ...HIDDEN_REGIONS]);
    if (HIDDEN_PLATFORMS.length + HIDDEN_REGIONS.length > 0) expect(text).toContain("not in");
    else expect(text).not.toContain("not in");
  });

  it("고른 플랫폼이 있으면 그중 하나여야 한다", () => {
    const { sql: text, params } = render(hasVisiblePlatform(["switch", "switch2"]));
    expect(text).toContain(" in ");
    expect(params).toEqual([...HIDDEN_PLATFORMS, ...HIDDEN_REGIONS, "switch", "switch2"]);
  });

  it("고른 플랫폼이 없으면 플랫폼 조건을 붙이지 않는다", () => {
    const { params } = render(hasVisiblePlatform([]));
    expect(params).toHaveLength(HIDDEN_PLATFORMS.length + HIDDEN_REGIONS.length);
  });
});

describe("mainGamesOnly", () => {
  it("본편 조건과 매칭 조건을 함께 건다", () => {
    const { sql: text } = render(mainGamesOnly());
    expect(text).toContain('"games"."content_type"');
    expect(text).toContain('"game_source_refs"');
    expect(text).toContain("exists");
  });

  it("쓸 수 있는 매칭만 인정한다 — pending, none 은 아니다", () => {
    const { sql: text } = render(mainGamesOnly());
    // 2026-09-15 psprices 병합분 2,173건은 none 이거나 ref 행 자체가 없다.
    // 목록에 낼 수 있는 근거는 "스토어와 이어졌다" 하나뿐이다
    expect(text).toContain("'auto'");
    expect(text).toContain("'manual'");
    expect(text).not.toContain("'pending'");
    expect(text).not.toContain("'none'");
  });

  it("그 게임의 ref 만 본다 (상관 조건)", () => {
    const { sql: text } = render(mainGamesOnly());
    expect(text).toContain('"game_source_refs"."game_id" = "games"."id"');
  });

  it("커버 없는 게임을 뺀다 — 회색 칸은 깨진 화면으로 읽힌다(노출 체크리스트 1번)", () => {
    const { sql: text } = render(mainGamesOnly());
    expect(text).toContain('"games"."cover_url" is not null');
  });

  it("매장 발 임시 게임을 뺀다 — 스토어 ID 가 붙어도 승격 전에는 목록에 안 나온다", () => {
    const { sql: text, params } = render(mainGamesOnly());
    expect(text).toContain('"games"."visibility"');
    expect(params).toContain("public");
  });
});

describe("runsOnRig", () => {
  it("기기가 안 적은 부위는 조건에 넣지 않는다 — CPU 만 적은 사람의 목록이 비지 않게", () => {
    const { sql: text } = render(runsOnRig({ osFamily: "windows", cpuTier: 10, gpuTier: null, ramMb: null }));
    expect(text).toContain("min_cpu_tier");
    expect(text).not.toContain("min_gpu_tier");
    expect(text).not.toContain("min_ram_mb");
  });

  it("문턱이 null 인 부위는 넘어가되, 한 부위는 실제로 견줘야 한다", () => {
    const { sql: text } = render(runsOnRig({ osFamily: "windows", cpuTier: 10, gpuTier: 12, ramMb: null }));
    // 못 견주는 자리를 "못 넘었다" 로 읽지 않는다
    expect(text).toContain('"min_cpu_tier" is null or');
    // 그렇다고 전부 넘어가면 판정을 한 것이 아니다
    expect(text).toContain('"min_gpu_tier" is not null');
  });

  it("기기의 OS 사양만 본다", () => {
    const { params } = render(runsOnRig({ osFamily: "mac", cpuTier: null, gpuTier: 12, ramMb: null }));
    expect(params).toContain("mac");
  });
});

describe("showcaseReady", () => {
  it("한국 가격과 알려진 게임 신호를 함께 요구한다", () => {
    const { sql: text } = render(showcaseReady());
    expect(text).toContain('"game_platforms"."current_price" is not null');
    expect(text).toContain('"games"."title_ko" is not null');
    expect(text).toContain("popularity_rank");
  });

  it("한글 제목은 문턱이 아니라 신호 중 하나다 — or 로만 붙는다", () => {
    const { sql: text } = render(showcaseReady());
    expect(text).toMatch(/title_ko" is not null\s+or /);
  });
});
