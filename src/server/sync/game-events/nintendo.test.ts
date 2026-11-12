import { describe, expect, it } from "vitest";
import { stripSiteSuffix, titleMatches, toCandidate, usefulDescription } from "./nintendo";

const item = (over: Partial<Parameters<typeof toCandidate>[0]>) => ({ slug: "s1", title: "", publishedAt: "2026-11-01T00:00:00Z", external: false, link: null, ...over });

describe("toCandidate", () => {
  it("2026-11-12 목록 실측 제목으로 갈래를 정한다", () => {
    expect(toCandidate(item({ title: "『피크민 4 …』 발매 기념 「피크민을 찾아라!」 이벤트가 개최됩니다." }))?.kind).toBe("event");
    expect(toCandidate(item({ title: "『피크민 4 …』의 체험판 배포 개시! Pikmin Day Direct에서 공개된 정보도 소개합니다." }))?.kind).toBe("demo");
    expect(toCandidate(item({ title: "『도깨비 술래잡기2』를 기간 한정으로 마음껏 즐기자! Nintendo Switch Online 가입자 한정 이벤트 「게임 트라이얼」 개최!" }))?.kind).toBe("demo");
    expect(toCandidate(item({ title: "『스타폭스』 무료 업데이트가 오늘 배포됩니다." }))?.kind).toBe("update");
    expect(toCandidate(item({ title: "『마리오 카트 월드』의 게임 내 이벤트 ｢온라인 챌린지 October Knockout｣이 10월 17일(토)에 개최." }))?.kind).toBe("event");
  });

  it("발매 결정, 예약 일정, 특전 글, 인터뷰는 고르지 않는다", () => {
    expect(toCandidate(item({ title: "『피크민 4 …』 11월 12일(목) 발매 결정" }))).toBeNull();
    expect(toCandidate(item({ title: "Nintendo Switch 2 소프트웨어 『Minecraft』 패키지 버전 예약 판매 일정 안내" }))).toBeNull();
    expect(toCandidate(item({ title: "『Nintendo Switch Sports Resort』 패키지 버전 예약 판매 일정 및 조기 구입 특전 안내" }))).toBeNull();
    expect(toCandidate(item({ title: "인터뷰 「개발자에게 물어보았습니다」 『젤다의 전설 시간의 오카리나』편이 공개되었습니다." }))).toBeNull();
  });

  it("바깥 링크 글은 공식 소개 페이지만 고른다", () => {
    expect(toCandidate(item({ title: "『젤다의 전설 시간의 오카리나』 공식 소개 페이지가 공개되었습니다.", external: true, link: "https://www.nintendo.com/kr/games/switch2/ampyc/" }))).toMatchObject({
      kind: "page",
      url: "https://www.nintendo.com/kr/games/switch2/ampyc/",
    });
    expect(toCandidate(item({ title: "추석 소프트웨어 라인업 세일! 이벤트", external: true, link: "https://www.nintendo.com/kr/topics/sale/" }))).toBeNull();
  });
});

describe("stripSiteSuffix", () => {
  it("사이트 꼬리를 뗀다", () => {
    expect(stripSiteSuffix("피크민 4 Nintendo Switch 2 Edition + 누구나 도전! 계획력 테스트 | Nintendo Switch 2 | 닌텐도")).toBe("피크민 4 Nintendo Switch 2 Edition + 누구나 도전! 계획력 테스트");
  });
});

describe("titleMatches", () => {
  it("글 아래 홍보 링크로 잡힌 다른 게임은 버린다(2026-11-12 실측)", () => {
    const starfox = "『스타폭스』 무료 업데이트가 오늘 배포됩니다.";
    expect(titleMatches(starfox, ["스타폭스"])).toBe(true);
    expect(titleMatches(starfox, ["젤다의전설시간의오카리나"])).toBe(false);
    expect(titleMatches("『스플래툰 3』의 새먼 런 온라인 대회", ["스플래툰레이더스"])).toBe(false);
  });

  it("괄호 이름이 에디션 이름 안에 있으면 맞다", () => {
    expect(titleMatches("『모여봐요 동물의 숲』의 너굴 상점이 등장!", ["모여봐요동물의숲nintendoswitch2edition"])).toBe(true);
  });

  it("행사, 매장 이름 괄호(「」)는 게임 이름으로 치지 않는다", () => {
    expect(titleMatches("「피크민 in 청량리」 오픈! 다양한 굿즈와 이벤트를 만나보세요.", ["피크민4"])).toBe(false);
  });
});

describe("usefulDescription", () => {
  it("제목을 되풀이하는 설명은 버린다", () => {
    expect(usefulDescription("『피크민 4』 이벤트가 개최됩니다.", "『피크민 4』 이벤트가 개최됩니다.")).toBeNull();
    expect(usefulDescription("당신의 계획력을 측정해 보세요!", "피크민 4")).toBe("당신의 계획력을 측정해 보세요!");
    expect(usefulDescription(null, "x")).toBeNull();
  });
});
