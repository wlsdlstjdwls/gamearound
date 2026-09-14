// 검색 조건이 실제로 어떤 SQL 과 바인딩을 만드는지 고정한다.
// DB 없이 검증하려고 드리즐 방언으로 렌더만 한다 — 이 파일은 네트워크, DB 를 건드리지 않는다.
import { describe, expect, it } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { titleMatch } from "./title-search";

const dialect = new PgDialect();
const render = (q: SQL<unknown>) => dialect.sqlToQuery(q);

describe("titleMatch", () => {
  it("제목 두 컬럼과 별칭을 함께 본다", () => {
    const { sql: text } = render(titleMatch("해리포터").hit);
    expect(text).toContain('"games"."title_en_norm"');
    expect(text).toContain('"games"."title_ko_norm"');
    expect(text).toContain('"game_aliases"');
    expect(text).toContain("exists");
  });

  it("별칭 조건은 그 게임의 별칭만 본다 (상관 조건)", () => {
    const { sql: text } = render(titleMatch("해리포터").hit);
    expect(text).toContain('"game_aliases"."game_id" = "games"."id"');
  });

  it("유사도는 제목 둘과 별칭 최고값 중 가장 큰 값이다", () => {
    const { sql: text, params } = render(titleMatch("해리포터").score);
    expect(text).toContain("greatest");
    expect(text).toContain("max(similarity");
    // 별칭이 없는 게임은 subquery 가 null 이고 greatest 가 null 을 무시한다 — 기존 점수가 그대로 남는다
    expect(params).toContain("해리포터");
  });

  it("질의는 정규화된 뒤 패턴이 된다", () => {
    const { params } = render(titleMatch("해리 포터!").hit);
    expect(params).toContain("%해리포터%");
    expect(titleMatch("해리 포터!").norm).toBe("해리포터");
  });

  it("LIKE 메타문자는 이스케이프한다 — 100% 가 모든 게임을 긁으면 안 된다", () => {
    // normalizeForSearch 가 %, _ 를 지우므로 실제로는 도달하지 않지만,
    // 정규화 규칙이 느슨해지는 날 이 조건이 먼저 깨지라고 남겨 둔다
    const { params } = render(titleMatch("a_b").hit);
    expect(params).toContain("%ab%");
  });

  it("빈 질의는 빈 norm 을 돌려준다 — 호출부가 이 값으로 검색을 건너뛴다", () => {
    expect(titleMatch("   ").norm).toBe("");
    expect(titleMatch("!!!").norm).toBe("");
  });
});
