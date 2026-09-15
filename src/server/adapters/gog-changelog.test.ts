// GOG 변경 기록 파서 테스트 — fixture 는 실응답(products/1207658924?expand=changelog), 네트워크 없음.
// 인라인 예시는 다른 게임에서 관측한 제목 형태를 그대로 옮긴 것이다(2026-09-15).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { changelogDate, parseGogChangelog } from "./gog";

const html = readFileSync(fileURLToPath(new URL("./__fixtures__/gog-changelog.html", import.meta.url)), "utf8");

describe("changelogDate", () => {
  it("날짜가 앞에 오는 형태", () => {
    expect(changelogDate("Windows Version Update (13 November 2024)")?.toISOString()).toBe("2024-11-13T00:00:00.000Z");
    expect(changelogDate("PATCH NOTES 9.6 (7 December 2021)")?.toISOString()).toBe("2021-12-07T00:00:00.000Z");
  });

  it("달 이름이 앞에 오는 형태", () => {
    expect(changelogDate("Patch 2.31 Sep 11th 2025")?.toISOString()).toBe("2025-09-11T00:00:00.000Z");
    expect(changelogDate("4.02 PATCH MARCH 13TH, 2023")?.toISOString()).toBe("2023-03-13T00:00:00.000Z");
    expect(changelogDate("Out-Of-EA Update - August 3rd 2023")?.toISOString()).toBe("2023-08-03T00:00:00.000Z");
  });

  it("날짜가 없는 소제목은 null — 패치가 아니라 패치 안의 항목이다", () => {
    expect(changelogDate("Vehicles")).toBeNull();
    expect(changelogDate("Online Features")).toBeNull();
  });

  it("달력에 없는 날짜는 받지 않는다", () => {
    expect(changelogDate("Update 31 February 2023")).toBeNull();
  });
});

describe("parseGogChangelog", () => {
  it("제목 줄에서 패치 기록을 뽑는다", () => {
    const notes = parseGogChangelog(html);
    expect(notes.length).toBe(4);
    expect(notes[0].title).toBe("Windows Version Update (13 November 2024)");
    expect(notes[0].publishedAt).toBe("2024-11-13T00:00:00.000Z");
    // 글 단위 주소가 없다 — 화면은 링크 없이 보여 준다
    expect(notes[0].url).toBeNull();
  });

  it("최신순으로 돌려준다", () => {
    const dates = parseGogChangelog(html).map((n) => n.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("버전이 있으면 외부 ID 에 함께 넣어 같은 날 두 번 고친 기록을 가른다", () => {
    const notes = parseGogChangelog("<h4>Patch 1.5 (22 March 2017)</h4><h4>Hotfix 1.5.1 (22 March 2017)</h4>");
    // 날짜가 같으면 정렬이 문서 순서를 유지한다 — 변경 기록은 위가 최신이다
    expect(notes.map((n) => n.externalId)).toEqual(["2017-03-22#1.5", "2017-03-22#1.5.1"]);
  });

  it("같은 날, 같은 버전은 한 번만 담는다 — 한 패치를 제목 여러 줄로 쪼갠 경우다", () => {
    const notes = parseGogChangelog("<h4>Patch 1.5 (22 March 2017)</h4><h3>Patch 1.5 (22 March 2017)</h3>");
    expect(notes).toHaveLength(1);
  });

  it("변경 기록이 없으면 빈 배열", () => {
    expect(parseGogChangelog(null)).toEqual([]);
    expect(parseGogChangelog("<p>없음</p>")).toEqual([]);
  });
});
