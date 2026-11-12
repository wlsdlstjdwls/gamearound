import { describe, expect, it } from "vitest";
import { parseSteamEvents } from "./events";

const NOW = new Date("2026-11-12T00:00:00Z");
const sec = (s: string) => Math.floor(new Date(s).getTime() / 1000);

function ev(over: Record<string, unknown>) {
  return {
    gid: "111",
    clan_steamid: "103582791429521508",
    event_name: "윈터 이벤트",
    event_type: 9,
    rtime32_start_time: sec("2026-11-10T00:00:00Z"),
    rtime32_end_time: sec("2026-11-20T00:00:00Z"),
    jsondata: JSON.stringify({ localized_capsule_image: ["en.png", null, null, null, "ko.png"], localized_subtitle: ["Snow", null, null, null, "눈 내리는 마을"] }),
    announcement_body: { gid: "999", headline: "윈터 이벤트", posttime: sec("2026-11-09T00:00:00Z") },
    ...over,
  };
}

describe("parseSteamEvents", () => {
  it("기간이 남은 이벤트를 한국어 칸 우선으로 읽는다", () => {
    expect(parseSteamEvents({ events: [ev({})] }, "1172470", NOW)).toEqual([
      {
        gid: "111",
        title: "윈터 이벤트",
        description: "눈 내리는 마을",
        imageUrl: "https://clan.akamai.steamstatic.com/images/100/ko.png",
        url: "https://store.steampowered.com/news/app/1172470/view/999",
        publishedAt: "2026-11-09T00:00:00.000Z",
        startsAt: "2026-11-10T00:00:00.000Z",
        endsAt: "2026-11-20T00:00:00.000Z",
      },
    ]);
  });

  it("끝난 이벤트, 공지(기간 없음), 패치 기록, 형식이 다른 항목은 버린다", () => {
    const events = [
      ev({ gid: "1", rtime32_end_time: sec("2026-11-11T00:00:00Z") }),
      ev({ gid: "2", rtime32_end_time: 0 }),
      ev({ gid: "3", event_type: 13 }),
      { gid: 5 },
    ];
    expect(parseSteamEvents({ events }, "1", NOW)).toEqual([]);
  });

  it("jsondata 가 깨져도 제목과 기간은 남긴다", () => {
    const [e] = parseSteamEvents({ events: [ev({ jsondata: "{" })] }, "1", NOW);
    expect(e).toMatchObject({ title: "윈터 이벤트", description: null, imageUrl: null });
  });

  it("응답 꼴이 다르면 빈 목록", () => {
    expect(parseSteamEvents({ success: 2 }, "1", NOW)).toEqual([]);
    expect(parseSteamEvents("x", "1", NOW)).toEqual([]);
  });
});
