// 진단 판정 테스트 — 네트워크 없음. "조용히 막힌 것"을 정상으로 읽지 않는지, 그리고
// 403 하나만 보고 원인을 단정하지 않는지가 핵심이다.
import { describe, expect, it } from "vitest";
import { classifyProbe, CONTROL_PROBE, describeVerdict, summarize, type ProbeResult, type ProbeVerdict } from "./classify";

const probe = (source: string, verdict: ProbeVerdict): ProbeResult => ({
  source,
  checks: "",
  verdict,
  status: null,
  bytes: null,
  elapsedMs: 0,
  detail: "",
});

describe("classifyProbe", () => {
  it("내용이 있는 2xx 는 ok", () => {
    expect(classifyProbe(200, 50_000, 500)).toBe("ok");
  });

  it("2xx 인데 본문이 비면 empty — 닌텐도가 한국 밖 IP 에 주는 202 + 빈 본문", () => {
    expect(classifyProbe(202, 0, 500)).toBe("empty");
    expect(classifyProbe(200, 12, 500)).toBe("empty");
  });

  it("기준 크기는 소스마다 다르다 — 32바이트 JSON 응답은 정상이다", () => {
    expect(classifyProbe(200, 32, 10)).toBe("ok");
    expect(classifyProbe(200, 32, 500)).toBe("empty");
  });

  it("403, 401, 429 는 blocked, 그 밖의 실패는 error", () => {
    expect(classifyProbe(403, 800, 10)).toBe("blocked");
    expect(classifyProbe(401, 800, 10)).toBe("blocked");
    expect(classifyProbe(429, 800, 10)).toBe("blocked");
    expect(classifyProbe(500, 0, 10)).toBe("error");
    expect(classifyProbe(404, 900, 10)).toBe("error");
  });
});

describe("describeVerdict", () => {
  it("사실만 적고 원인은 단정하지 않는다", () => {
    expect(describeVerdict("epic (fetch)", "blocked")).toBe("epic (fetch): 거부됨 (403, 401, 429)");
    expect(describeVerdict("steam", "ok")).toBe("steam: 응답 정상");
  });
});

describe("summarize", () => {
  const controlOk = probe(CONTROL_PROBE, "ok");

  it("닌텐도가 열리면 가정용 회선 의존을 뗄 수 있다고 말한다", () => {
    const out = summarize([probe("nintendo", "ok"), controlOk]);
    expect(out[0]).toContain("수집 가능");
  });

  it("닌텐도 빈 응답은 한국 밖 IP 로 읽는다", () => {
    expect(summarize([probe("nintendo", "empty"), controlOk])[0]).toContain("한국 밖 IP");
  });

  it("Epic 은 fetch 가 막혀도 curl 이 되면 IP 통과로 읽는다 (가정용 회선)", () => {
    const out = summarize([probe("epic (fetch)", "blocked"), probe("epic (curl)", "ok"), controlOk]);
    expect(out.join(" ")).toContain("TLS 지문만 막혔다");
  });

  it("Epic 은 curl 로도 막히면 IP 대역 차단으로 읽는다 (Actions 러너)", () => {
    const out = summarize([probe("epic (fetch)", "blocked"), probe("epic (curl)", "blocked"), controlOk]);
    expect(out.join(" ")).toContain("출구 IP 대역");
  });

  it("curl 이 없는 환경이면 Epic 은 불가로 읽는다 (Vercel 함수)", () => {
    const out = summarize([probe("epic (fetch)", "blocked"), probe("epic (curl)", "error"), controlOk]);
    expect(out.join(" ")).toContain("curl 이 없다");
  });

  it("대조군까지 실패하면 스토어가 아니라 환경을 의심하라고 한다", () => {
    const out = summarize([probe("nintendo", "error"), probe(CONTROL_PROBE, "error")]);
    expect(out.join(" ")).toContain("바깥 연결");
  });
  it("발견 경로와 가격 경로가 다 열려야 옮길 수 있다고 말한다", () => {
    const out = summarize([probe("steam (발견)", "ok"), probe("steam (가격)", "ok"), controlOk]);
    expect(out.join(" ")).toContain("Steam: 서울 함수에서 열린다");
  });

  it("가격 경로만 막혀도 옮기지 말라고 말한다 — 값 없는 신규 등록을 막는다", () => {
    const out = summarize([probe("xbox (발견)", "ok"), probe("xbox (가격)", "blocked"), controlOk]);
    expect(out.join(" ")).toContain("Xbox: 서울 함수에서 막힌다");
    expect(out.join(" ")).toContain("xbox (가격) blocked");
  });

  it("진단에 없는 소스는 아무 말도 하지 않는다", () => {
    const out = summarize([controlOk]);
    expect(out.join(" ")).not.toContain("Steam");
    expect(out.join(" ")).not.toContain("Xbox");
  });
});
