// 종류 교정 판단 테스트 — 한 방향(부모 없는 dlc 에서 game)만 고친다
import { describe, expect, it } from "vitest";
import { correctedContentType } from "./content-type-fix";

describe("correctedContentType", () => {
  it("부모 없는 dlc 를 스토어가 game 이라 하면 본편으로 — Roblox, 섀도우 오브 워", () => {
    expect(correctedContentType({ contentType: "dlc", parentGameId: null }, "game")).toBe("game");
  });

  it("부모가 있는 dlc 는 둔다 — 부모 잇기가 붙인 행이다", () => {
    expect(correctedContentType({ contentType: "dlc", parentGameId: "p" }, "game")).toBeNull();
  });

  it("에디션, 번들은 둔다 — Xbox 는 에디션도 game 이라 답한다", () => {
    expect(correctedContentType({ contentType: "edition", parentGameId: null }, "game")).toBeNull();
    expect(correctedContentType({ contentType: "bundle", parentGameId: null }, "game")).toBeNull();
  });

  it("스토어가 종류를 비우면(PS 콘셉트) 믿지 않는다", () => {
    expect(correctedContentType({ contentType: "dlc", parentGameId: null }, undefined)).toBeNull();
    expect(correctedContentType({ contentType: "dlc", parentGameId: null }, null)).toBeNull();
  });

  it("이미 본편이거나 스토어가 dlc 라 하면 할 일이 없다", () => {
    expect(correctedContentType({ contentType: "game", parentGameId: null }, "game")).toBeNull();
    expect(correctedContentType({ contentType: "dlc", parentGameId: null }, "dlc")).toBeNull();
  });
});
