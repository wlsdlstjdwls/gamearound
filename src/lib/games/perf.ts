// 성능 표지 — 스토어, 위키가 주는 "4K, 60fps, HDR" 같은 표시를 우리 열쇠 하나로 모은다(2026-11-16 사용자 "성능 데이터 되는 대로 다").
//
// 출처와 한계(실측):
//  - Xbox: 카탈로그 상품 속성(Properties.Attributes)의 Capability4k, 60fps, 120fps, CapabilityHDR, RayTracing, ConsoleGen9Optimized 등.
//    "성능 모드 1440p 60fps / 화질 모드 4K 30fps" 처럼 모드별 숫자는 주지 않는다 — 지원 여부 표지만 있다.
//  - Steam(PC): PCGamingWiki 문서의 Video 표("60 fps", "120 fps", "4k ultra hd", "hdr", "ray tracing", "upscaling", "framegen").
//    Cargo 질의는 막혀 있어 문서 원문(parse API)을 읽는다(adapters/pcgamingwiki).
//  - PlayStation, 닌텐도: 스토어가 성능 값을 주지 않는다. 비워 두고 화면은 "공개된 성능 정보가 없어요" 라고 말한다.
// 순수 함수다 — DB, 네트워크를 모른다.

export const PERF_FEATURES = ["8k", "4k", "120fps", "60fps", "hdr", "raytracing", "vrr", "upscaling", "framegen", "ultrawide", "series_optimized"] as const;
export type PerfFeature = (typeof PERF_FEATURES)[number];

/** 화면 이름. 해상도, 프레임이 먼저 읽히게 PERF_FEATURES 순서대로 선다 */
export const PERF_FEATURE_LABEL: Record<PerfFeature, string> = {
  "8k": "8K",
  "4k": "4K",
  "120fps": "120fps",
  "60fps": "60fps",
  hdr: "HDR",
  raytracing: "레이 트레이싱",
  vrr: "가변 주사율",
  upscaling: "업스케일링",
  framegen: "프레임 생성",
  ultrawide: "울트라와이드",
  series_optimized: "Series X|S 최적화",
};

/** Xbox 카탈로그 속성 이름 → 열쇠. 2026-11-16 사이버펑크 2077 응답에서 읽은 이름이다 */
const XBOX_ATTRIBUTE: Record<string, PerfFeature> = {
  Capability8k: "8k",
  Capability4k: "4k",
  "120fps": "120fps",
  "60fps": "60fps",
  CapabilityHDR: "hdr",
  RayTracing: "raytracing",
  VariableRefreshRate: "vrr",
  ConsoleGen9Optimized: "series_optimized",
};

/** PCGamingWiki Video 표의 칸 이름 → 열쇠. 값이 true 일 때만 켠다(hdr 은 limited 도 켠다 — 지원은 하되 일부만 된다는 뜻이다) */
const PCGW_FIELD: Record<string, PerfFeature> = {
  "4k ultra hd": "4k",
  "120 fps": "120fps",
  "60 fps": "60fps",
  hdr: "hdr",
  "ray tracing": "raytracing",
  upscaling: "upscaling",
  framegen: "framegen",
  ultrawidescreen: "ultrawide",
};

/** 정해진 순서로 줄 세우고 겹친 것을 지운다 — 같은 값이 늘 같은 배열이어야 "바뀌었나" 비교가 흔들리지 않는다 */
export function normalizePerf(keys: Iterable<string>): PerfFeature[] {
  const set = new Set(keys);
  return PERF_FEATURES.filter((k) => set.has(k));
}

export function perfFromXboxAttributes(names: readonly (string | null | undefined)[]): PerfFeature[] {
  return normalizePerf(names.flatMap((n) => (n && XBOX_ATTRIBUTE[n] ? [XBOX_ATTRIBUTE[n]] : [])));
}

/** PCGamingWiki 문서 원문(위키 문법)에서 Video 표 칸을 읽는다. "|60 fps = true" 꼴의 줄만 본다 */
export function perfFromPcgwWikitext(wikitext: string): PerfFeature[] {
  const out: PerfFeature[] = [];
  for (const m of wikitext.matchAll(/^\|\s*([a-z0-9+ ]+?)\s*=\s*([a-z ]+?)\s*$/gim)) {
    const key = PCGW_FIELD[m[1].toLowerCase()];
    const value = m[2].toLowerCase();
    if (key && (value === "true" || value === "always on" || (key === "hdr" && value === "limited"))) out.push(key);
  }
  return normalizePerf(out);
}

/** 화면 한 줄 요약 — 최대 해상도와 최대 프레임("4K | 120fps"). 둘 다 모르면 null */
export function perfHeadline(features: readonly string[]): string | null {
  const res = features.includes("8k") ? "8K" : features.includes("4k") ? "4K" : null;
  const fps = features.includes("120fps") ? "120fps" : features.includes("60fps") ? "60fps" : null;
  const parts = [res, fps].filter((v): v is string => v !== null);
  return parts.length > 0 ? parts.join(" | ") : null;
}
