// OG 이미지에 넘길 한글 폰트를 구글 폰트 서브셋으로 받아 온다.
// 실제로 그릴 글자만 요청하므로 게임 제목이 무엇이든 응답은 수 KB 다.
//
// 여기서 fetch 를 직접 부르는 이유: 이건 외부 데이터 수집이 아니라 렌더링 자원 조달이라
// server/adapters 계층(HTTP 클라이언트, 재시도, 레이트 리밋)에 올릴 성질이 아니다.
import { OG_FONT_REVALIDATE_SECONDS } from "@/lib/cache";
import {
  OG_FONT_CSS_ENDPOINT,
  OG_FONT_FAMILY,
  OG_FONT_LEGACY_UA,
  OG_FONT_SRC_PATTERN,
  OG_FONT_WEIGHTS,
} from "./constants";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: (typeof OG_FONT_WEIGHTS)[number];
  style: "normal";
};

/** 중복 글자를 걷어낸다. 서브셋 URL 이 짧아지고, 같은 글리프 조합이면 캐시가 재사용된다 */
function glyphs(...parts: (string | null | undefined)[]): string {
  return [...new Set(parts.filter(Boolean).join(""))].sort().join("");
}

async function loadWeight(text: string, weight: (typeof OG_FONT_WEIGHTS)[number]): Promise<OgFont> {
  const params = new URLSearchParams({ family: `${OG_FONT_FAMILY}:wght@${weight}`, text });
  const css = await fetch(`${OG_FONT_CSS_ENDPOINT}?${params}`, {
    headers: { "User-Agent": OG_FONT_LEGACY_UA },
    next: { revalidate: OG_FONT_REVALIDATE_SECONDS },
  }).then((res) => res.text());

  const src = OG_FONT_SRC_PATTERN.exec(css)?.[1];
  if (!src) throw new Error(`OG 폰트 서브셋 주소를 찾지 못함 (weight ${weight})`);

  const data = await fetch(src, { next: { revalidate: OG_FONT_REVALIDATE_SECONDS } }).then((res) => res.arrayBuffer());
  return { name: OG_FONT_FAMILY, data, weight, style: "normal" };
}

/**
 * 이미지에 들어갈 문자열을 전부 넘긴다. 빠뜨린 글자는 빈칸으로 렌더된다.
 * 굵기별 요청은 병렬로 보낸다 — 순차로 보내면 OG 생성이 그만큼 느려진다.
 */
export async function loadOgFonts(...text: (string | null | undefined)[]): Promise<OgFont[]> {
  const subset = glyphs(...text);
  return Promise.all(OG_FONT_WEIGHTS.map((weight) => loadWeight(subset, weight)));
}
