// IGDB 회사 응답 해석(순수 함수). 네트워크는 index.ts 가 한다.
//
// 고르는 규칙이 이 파일의 핵심이다. 이름이 같은 후보 가운데, 그 회사가 만들거나 배급한 게임 이름이 우리 카탈로그의
// 그 회사 게임과 하나라도 겹치는 것이 **딱 하나**일 때만 고른다. "Gaming Limited", "Happy Player" 같은 흔한 이름은
// 이름만으로 고르면 남의 나라, 남의 소개가 박힌다(위키데이터 쪽 company-writer 와 같은 원칙).
import { normalizeCompanyName } from "@/lib/company-name";
import { IGDB_LOGO_URL, IGDB_WEBSITE_OFFICIAL, ISO_NUMERIC_TO_ALPHA2 } from "./constants";

export interface IgdbCompanyRaw {
  id: number;
  name: string;
  country?: number;
  start_date?: number;
  description?: string;
  logo?: { image_id?: string };
  websites?: Array<{ url?: string; type?: number; category?: number }>;
  developed?: Array<{ name?: string }>;
  published?: Array<{ name?: string }>;
}

export interface IgdbCompanyInfo {
  igdbId: number;
  countryCode: string | null;
  countryNameKo: string | null;
  foundedAt: string | null;
  websiteUrl: string | null;
  description: string | null;
  logoUrl: string | null;
}

/** 게임 제목 비교 꼴. 상표 기호, 구두점, 대소문자 차이를 없앤다 */
export function gameKey(title: string): string {
  return title
    // 상표 기호를 먼저 지운다 — NFKD 가 ™ 를 "TM" 낱말로 풀어 버린다
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const REGION_NAMES_KO = new Intl.DisplayNames(["ko"], { type: "region" });
/** Intl 이 긴 공식 이름을 주는 지역. 화면의 나라 칸은 짧은 이름이다(실측: "홍콩(중국 특별행정구)") */
const SHORT_REGION_KO: Readonly<Record<string, string>> = { HK: "홍콩", MO: "마카오" };

export function toCompanyInfo(raw: IgdbCompanyRaw): IgdbCompanyInfo {
  const alpha2 = raw.country ? ISO_NUMERIC_TO_ALPHA2[raw.country] ?? null : null;
  const sites = raw.websites ?? [];
  const official = sites.find((w) => (w.type ?? w.category) === IGDB_WEBSITE_OFFICIAL)?.url ?? null;
  return {
    igdbId: raw.id,
    countryCode: alpha2,
    countryNameKo: alpha2 ? SHORT_REGION_KO[alpha2] ?? REGION_NAMES_KO.of(alpha2) ?? null : null,
    foundedAt: raw.start_date ? new Date(raw.start_date * 1000).toISOString().slice(0, 10) : null,
    websiteUrl: official,
    description: raw.description?.trim() || null,
    logoUrl: raw.logo?.image_id ? IGDB_LOGO_URL(raw.logo.image_id) : null,
  };
}

/** 이름이 같고, 우리 게임과 겹치는 후보가 하나일 때 그 후보. 아니면 null */
export function pickCompany(name: string, ourGameTitles: readonly string[], candidates: readonly IgdbCompanyRaw[]): IgdbCompanyRaw | null {
  const norm = normalizeCompanyName(name);
  const ours = new Set(ourGameTitles.map(gameKey));
  const hits = candidates.filter((c) => {
    if (normalizeCompanyName(c.name) !== norm) return false;
    const theirs = [...(c.developed ?? []), ...(c.published ?? [])].map((g) => gameKey(g.name ?? ""));
    return theirs.some((t) => t && ours.has(t));
  });
  return hits.length === 1 ? hits[0] : null;
}
