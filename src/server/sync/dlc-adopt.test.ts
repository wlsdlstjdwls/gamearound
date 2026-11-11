// 새 DLC 를 기존 자식에 잇는 판정 — 순수 함수만. DB 는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { pickAdoptions, type AdoptCandidate, type OrphanChild } from "./dlc-adopt";

const orphan = (id: string, titles: string[], parentId = "p1"): OrphanChild => ({ id, slug: id, parentId, titles });
const cand = (externalId: string, titles: string[], parentId = "p1"): AdoptCandidate => ({ externalId, parentId, titles });

describe("pickAdoptions", () => {
  it("같은 본편 아래 글자가 같은 자식 하나에 잇는다(띄어쓰기, 기호는 안 본다)", () => {
    const got = pickAdoptions([cand("EP1-DLC", ["Season Pass", "시즌 패스"])], [orphan("o1", ["시즌패스"])]);
    expect(got.get("EP1-DLC")?.id).toBe("o1");
  });

  it("한 글자라도 다르면 잇지 않는다(유사도로 보지 않는다)", () => {
    const got = pickAdoptions([cand("EP1-DLC", ["Season Pass 2"])], [orphan("o1", ["Season Pass"])]);
    expect(got.size).toBe(0);
  });

  it("다른 본편의 같은 이름 자식은 후보가 아니다", () => {
    const got = pickAdoptions([cand("EP1-DLC", ["Season Pass"], "p1")], [orphan("o1", ["Season Pass"], "p2")]);
    expect(got.size).toBe(0);
  });

  it("후보가 둘이면 잇지 않는다", () => {
    const got = pickAdoptions([cand("EP1-DLC", ["Soundtrack"])], [orphan("o1", ["Soundtrack"]), orphan("o2", ["SOUNDTRACK"])]);
    expect(got.size).toBe(0);
  });

  it("한 자식을 두 DLC 가 원하면 둘 다 잇지 않는다", () => {
    const got = pickAdoptions([cand("A", ["Costume Pack"]), cand("B", ["Costume Pack"])], [orphan("o1", ["Costume Pack"])]);
    expect(got.size).toBe(0);
  });

  it("제목이 없는 스냅샷은 판정에서 빠진다", () => {
    expect(pickAdoptions([cand("A", [])], [orphan("o1", ["Costume Pack"])]).size).toBe(0);
  });
});
