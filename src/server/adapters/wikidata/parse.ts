// 위키데이터 응답(검색 API, SPARQL)을 CompanyInfo 로 바꾸는 순수 파서. 네트워크를 모른다.
import { normalizeCompanyName } from "@/lib/company-name";
import type { CompanyInfo } from "../types";

/** SPARQL JSON 결과의 최소 형태만 본다 — 나머지 필드는 쓰지 않는다 */
interface Binding {
  [key: string]: { value?: unknown } | undefined;
}
interface SparqlResults {
  results?: { bindings?: Binding[] };
}

const str = (b: Binding, key: string): string | null => {
  const v = b[key]?.value;
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/** 검색 API 응답의 최소 형태 */
interface SearchHit {
  id?: unknown;
  label?: unknown;
  match?: { text?: unknown } | undefined;
}

/**
 * 검색 API 결과에서 **이름이 정확히 일치하는** 후보만 남긴다.
 * 검색 API 는 접두사 일치도 돌려주기 때문에("Nintendo" 로 "Nintendo Switch" 가 온다)
 * 그대로 쓰면 회사가 아닌 항목이 섞이고 후보 수가 부풀어 자동 확정이 영영 안 된다.
 * 비교는 정규화한 이름끼리 한다 — "FromSoftware, Inc." 와 "FromSoftware" 는 같은 회사다.
 */
export function exactSearchMatches(payload: unknown, queryName: string): string[] {
  const hits = (payload as { search?: unknown })?.search;
  if (!Array.isArray(hits)) return [];
  const target = normalizeCompanyName(queryName);
  if (!target) return [];
  const out: string[] = [];
  for (const hit of hits as SearchHit[]) {
    if (!hit || typeof hit !== "object" || typeof hit.id !== "string") continue;
    const candidates = [hit.label, hit.match?.text].filter((v): v is string => typeof v === "string");
    if (candidates.some((c) => normalizeCompanyName(c) === target)) out.push(hit.id);
  }
  return Array.from(new Set(out));
}

/** "http://www.wikidata.org/entity/Q2414469" 에서 Q번호만 */
export function entityId(uri: string | null): string | null {
  if (!uri) return null;
  const m = uri.match(/\/(Q\d+)$/);
  return m ? m[1] : null;
}

/** "1986-11-01T00:00:00Z" 형태의 xsd:dateTime 을 YYYY-MM-DD 로. 연도만 있는 값도 있어 실패하면 null */
export function toIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(-?\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  // 위키데이터는 정밀도가 낮은 값을 01-01 로 채워 넣는다. 그래도 연도는 맞으므로 버리지 않는다.
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${mo}-${d}`;
}

/** 라벨 서비스는 값이 없으면 Q번호를 그대로 돌려준다. 그건 사람이 읽을 이름이 아니라서 버린다 */
function humanLabel(raw: string | null): string | null {
  if (!raw) return null;
  return /^Q\d+$/.test(raw) ? null : raw;
}

/**
 * 결과를 회사 엔티티 단위로 묶는다.
 * OPTIONAL 이 여러 개라 한 회사가 여러 행으로 쪼개져 온다(국가 2개, 본사 2개 등) —
 * 행 수를 후보 수로 착각하면 멀쩡한 회사가 전부 "모호함"이 된다.
 */
export function groupCompanies(payload: unknown): Map<string, CompanyInfo> {
  const bindings = (payload as SparqlResults)?.results?.bindings;
  const out = new Map<string, CompanyInfo>();
  if (!Array.isArray(bindings)) return out;

  for (const b of bindings) {
    if (!b || typeof b !== "object") continue;
    const id = entityId(str(b, "company"));
    if (!id) continue;

    const nameEn = humanLabel(str(b, "labelEn"));
    const prev = out.get(id);
    const merged: CompanyInfo = {
      externalId: id,
      // 영문 라벨이 없는 회사는 한국어명을, 그것도 없으면 Q번호를 이름으로 둔다(호출부가 원문으로 덮는다)
      nameEn: prev?.nameEn ?? nameEn ?? humanLabel(str(b, "labelKo")) ?? id,
      nameKo: prev?.nameKo ?? humanLabel(str(b, "labelKo")),
      countryCode: prev?.countryCode ?? str(b, "countryCode")?.toUpperCase() ?? null,
      countryNameKo: prev?.countryNameKo ?? humanLabel(str(b, "countryLabel")),
      foundedAt: prev?.foundedAt ?? toIsoDate(str(b, "inception")),
      hqNameKo: prev?.hqNameKo ?? humanLabel(str(b, "hqLabel")),
      websiteUrl: prev?.websiteUrl ?? str(b, "website"),
      description: prev?.description ?? humanLabel(str(b, "descKo")),
    };
    out.set(id, merged);
  }
  return out;
}

/**
 * 자동 확정 판정. 후보가 정확히 1건일 때만 값을 준다.
 * 동명이인을 자동 확정하면 국가가 틀린 채로 회사 화면에 박히고, 그 오류는 크롤러가 고쳐주지 않는다.
 *
 * 후보가 둘 이상일 때 **이름을 스스로 그렇게 부르는 회사**가 딱 하나면 그것으로 좁힌다(queryName 을 준 경우).
 * 왜 필요했나(2026-09-21 실측): "Square Enix" 로 검색하면 Q207784(스퀘어 에닉스)와
 * Q679933(아이도스 인터랙티브)이 함께 온다. 아이도스가 걸리는 이유는 별칭 "Square Enix Ltd" 가
 * 법인 접미어를 떼면 같은 키가 되기 때문이다. 그래서 별칭이 아니라 **그 회사의 이름**이 일치하는지를 본다 —
 * 아이도스의 이름은 "Eidos Interactive" 라서 빠지고, 남는 하나가 진짜 스퀘어 에닉스다.
 * 게임 162개가 이 한 이름에 걸려 있었다.
 *
 * 이름이 진짜로 같은 동명 회사 둘은 여전히 null 이다 — 그 자리는 사람이 봐야 한다.
 */
export function resolveSingleCompany(payload: unknown, queryName?: string): CompanyInfo | null {
  return pickCompany([...groupCompanies(payload).values()], queryName);
}

/**
 * 판정 규칙 본체 — 응답 형태를 모르고 후보 목록만 본다.
 *
 * 따로 뽑은 이유: 이름 여러 개의 후보를 **한 질의에 몰아넣고** 답을 나중에 이름별로 가르는 경로가 있다
 * (일괄 확정 스크립트). 거기서는 이름 하나짜리 payload 가 아예 만들어지지 않으므로,
 * 판정 규칙이 payload 모양에 묶여 있으면 규칙을 두 벌 갖게 된다. 두 벌이 되는 순간 갈라진다.
 */
export function pickCompany(candidates: CompanyInfo[], queryName?: string): CompanyInfo | null {
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0 || !queryName) return null;

  const target = normalizeCompanyName(queryName);
  if (!target) return null;
  const named = candidates.filter(
    (c) => normalizeCompanyName(c.nameEn) === target || (c.nameKo ? normalizeCompanyName(c.nameKo) === target : false),
  );
  return named.length === 1 ? named[0] : null;
}
