import { describe, expect, it } from "vitest";
import { resolveNav, trailKind } from "@/lib/nav";

const q = (s = "") => new URLSearchParams(s);

describe("resolveNav", () => {
  it("목록은 전체 게임, sale=1 이면 할인 게임", () => {
    expect(resolveNav("/games", q()).sub?.label).toBe("전체 게임");
    expect(resolveNav("/games", q("sale=1&sort=price")).sub?.label).toBe("할인 게임");
  });

  it("게임 상세는 메뉴만 켜고 칸은 켜지 않는다", () => {
    const r = resolveNav("/games/elden-ring", q());
    expect(r.section?.key).toBe("explore");
    expect(r.sub).toBeNull();
  });

  it("긴 경로가 이긴다: /indie/mine 은 내 게임 관리", () => {
    expect(resolveNav("/indie/mine", q()).sub?.label).toBe("내 게임 관리");
    expect(resolveNav("/indie/some-game", q()).sub?.label).toBe("전체 인디 게임");
  });

  it("통계, 플레이테스트 관리, 광고 걸기와 결제 화면은 모두 내 게임 관리를 켠다", () => {
    for (const path of ["/indie/mine/stats", "/indie/mine/abc/playtest", "/indie/mine/abc/boost", "/indie/mine/plans", "/indie/mine/membership", "/indie/mine/ads", "/indie/mine/payments"]) {
      expect(resolveNav(path, q()).sub?.label).toBe("내 게임 관리");
    }
    expect(trailKind("/indie/mine/plans", resolveNav("/indie/mine/plans", q()).sub)).toBe("back");
    // 고치기(/indie/mine/<id>)도 내 게임 관리
    expect(resolveNav("/indie/mine/abc", q()).sub?.label).toBe("내 게임 관리");
  });

  it("라운지 전체 글은 라운지 홈을 켠다(목업 subOf lga)", () => {
    expect(resolveNav("/lounge/all", q("page=2")).sub?.label).toBe("라운지 홈");
    expect(trailKind("/lounge/all", resolveNav("/lounge/all", q()).sub)).toBeNull();
    // 라운지 글 상세는 여전히 칸을 켜지 않는다
    expect(resolveNav("/lounge/p/abc", q()).sub).toBeNull();
  });

  it("하위 칸 밖 소속 경로와 메뉴 밖 화면", () => {
    expect(resolveNav("/search", q("q=a")).section?.key).toBe("explore");
    expect(resolveNav("/board/reviews", q()).sub?.label).toBe("리뷰");
    expect(resolveNav("/board/p/abc", q()).sub).toBeNull();
    expect(resolveNav("/board/p/abc", q()).section?.key).toBe("board");
    expect(resolveNav("/", q()).section).toBeNull();
    // 계정 화면은 메뉴 넷 밖의 내 정보 띠(ACCOUNT_SECTION)에 선다
    expect(resolveNav("/settings", q()).section?.key).toBe("account");
    expect(resolveNav("/settings/devices", q()).sub?.label).toBe("설정");
  });
});

describe("trailKind", () => {
  it("하위 칸 그 자체에는 서지 않는다 — 띠가 같은 말을 한다", () => expect(trailKind("/hall-of-fame", resolveNav("/hall-of-fame", q()).sub)).toBeNull());
  it("내 게임 관리(등록현황)에도 서지 않는다", () => expect(trailKind("/indie/mine", resolveNav("/indie/mine", q()).sub)).toBeNull());
  it("댓글함은 되돌아가기만", () => expect(trailKind("/lounge/comments", resolveNav("/lounge/comments", q()).sub)).toBe("back"));
  it("인디 상세는 되돌아가기만 — 경로 줄은 화면이 게임 이름으로 직접 세운다", () => expect(trailKind("/indie/some-game", resolveNav("/indie/some-game", q()).sub)).toBe("back"));
  it("인디 고치기(/indie/mine/<id>)는 세우지 않는다", () => expect(trailKind("/indie/mine/abc", resolveNav("/indie/mine/abc", q()).sub)).toBeNull());
  it("내 게임 등록, 글쓰기에는 서지 않는다(10-29 경로 줄 걷음)", () => {
    expect(trailKind("/indie/new", resolveNav("/indie/new", q()).sub)).toBeNull();
    expect(trailKind("/lounge/write", resolveNav("/lounge/write", q()).sub)).toBeNull();
  });
  it("계정 화면은 내 정보 띠가 서서 세우지 않는다", () => expect(trailKind("/alerts", resolveNav("/alerts", q()).sub)).toBeNull());
  it("홈은 아무것도 없다", () => expect(trailKind("/", resolveNav("/", q()).sub)).toBeNull());
});

describe("게임 게시판 상세, 글쓰기의 소속", () => {
  it("글 상세는 제 게시판 칸을 켜고 되돌아가기 줄은 없다", () => {
    const r = resolveNav("/board/guides/p/abc", q());
    expect(r.sub?.label).toBe("공략");
    expect(trailKind("/board/guides/p/abc", r.sub)).toBeNull();
  });

  it("글쓰기는 고른 카테고리의 칸을 켠다", () => {
    expect(resolveNav("/board/write", q("category=promo")).sub?.label).toBe("홍보");
    expect(resolveNav("/board/write", q()).sub).toBeNull();
  });

  it("전체 글은 게시판 홈을 켠다", () => {
    expect(resolveNav("/board/all", q()).sub?.label).toBe("게시판 홈");
    expect(trailKind("/board/all", resolveNav("/board/all", q()).sub)).toBeNull();
  });
});

describe("인디 상세의 출처(?from=)", () => {
  it("명예의 전당, 슈퍼루키에서 오면 인디 게임 메뉴의 그 칸을 켠다", () => {
    const hof = resolveNav("/indie/some-game", q("from=hof"));
    expect([hof.section?.key, hof.sub?.label]).toEqual(["indie", "명예의 전당"]);
    const rookies = resolveNav("/indie/some-game", q("from=rookies"));
    expect([rookies.section?.key, rookies.sub?.label]).toEqual(["indie", "슈퍼루키"]);
  });
  it("등록현황에서 오면 내 게임 관리, 출처가 없거나 모르는 값이면 전체 인디 게임", () => {
    expect(resolveNav("/indie/some-game", q("from=mine")).sub?.label).toBe("내 게임 관리");
    expect(resolveNav("/indie/some-game", q("from=zzz")).sub?.label).toBe("전체 인디 게임");
  });
  it("출처는 상세 한 칸에만 먹는다 — 목록, 고치기 화면은 그대로", () => {
    expect(resolveNav("/indie", q("from=hof")).sub?.label).toBe("전체 인디 게임");
    expect(resolveNav("/indie/mine/abc", q("from=hof")).sub?.label).toBe("내 게임 관리");
  });
});
