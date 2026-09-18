// 목록, 검색이 공유하는 조건 조각이 실제로 어떤 SQL 과 바인딩을 만드는지 고정한다.
// DB 없이 검증하려고 드리즐 방언으로 렌더만 한다 — 이 파일은 네트워크, DB 를 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { hasVisiblePlatform, mainGamesOnly } from "./filters";
import { HIDDEN_PLATFORMS } from "@/lib/platform";

const dialect = new PgDialect();
const render = (q: SQL<unknown>) => dialect.sqlToQuery(q);

describe("hasVisiblePlatform", () => {
  it("지역을 보지 않는다 — 이 조건의 존재 이유다", () => {
    // 한국 행이 없는 게임(2026-09-18 실측 477건, 전부 일본 스위치)을 검색어 질의가 받으려면
    // 플랫폼 확인이 region 을 걸어서는 안 된다
    const { sql: text } = render(hasVisiblePlatform([]));
    expect(text).not.toContain("region");
  });

  it("그 게임의 행만 본다 (상관 조건)", () => {
    const { sql: text } = render(hasVisiblePlatform([]));
    expect(text).toContain("exists");
    expect(text).toContain('"game_platforms"."game_id" = "games"."id"');
  });

  it("숨긴 스토어는 값마다 자리표시자로 빠진다", () => {
    const { sql: text, params } = render(hasVisiblePlatform([]));
    expect(text).toContain("not in");
    // 배열을 통째로 넘기면 자리표시자 하나에 배열이 묶여 조건이 조용히 어긋난다
    expect(params).toEqual([...HIDDEN_PLATFORMS]);
  });

  it("고른 플랫폼이 있으면 그중 하나여야 한다", () => {
    const { sql: text, params } = render(hasVisiblePlatform(["switch", "switch2"]));
    expect(text).toContain(" in ");
    expect(params).toEqual([...HIDDEN_PLATFORMS, "switch", "switch2"]);
  });

  it("고른 플랫폼이 없으면 플랫폼 조건을 붙이지 않는다", () => {
    const { params } = render(hasVisiblePlatform([]));
    expect(params).toHaveLength(HIDDEN_PLATFORMS.length);
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
});
