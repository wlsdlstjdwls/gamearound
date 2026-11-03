// IGDB 회사 조회 — 위키데이터에 없는 회사(이름만으로 세운 회사)의 나라, 설립일, 웹사이트, 소개, 로고를 채우는 데만 쓴다.
// 가져오기만 한다(§1). 쓰기는 sync/company-igdb.
//
// 인증: Twitch 앱 키로 client_credentials 토큰을 받는다(약 60일 유효). 회차마다 한 번 받고 회차 안에서 다시 쓴다 —
// 토큰을 저장해 두지 않는 이유는 회차가 하루 두 번뿐이라 받는 비용이 요청 하나라서다.
import { createHttpClient } from "../http";
import { AdapterError } from "../types";
import {
  IGDB_CANDIDATE_LIMIT,
  IGDB_CLIENT_ID_ENV,
  IGDB_CLIENT_SECRET_ENV,
  IGDB_COMPANIES_URL,
  IGDB_TOKEN_URL,
} from "./constants";
import type { IgdbCompanyRaw } from "./parse";

export { pickCompany, toCompanyInfo, type IgdbCompanyInfo, type IgdbCompanyRaw } from "./parse";
export { IGDB_REQUEST_GAP_MS } from "./constants";

/** 키가 둘 다 있는가. 없으면 보강 단계를 통째로 건너뛴다 */
export function igdbConfigured(): boolean {
  return Boolean(process.env[IGDB_CLIENT_ID_ENV]?.trim() && process.env[IGDB_CLIENT_SECRET_ENV]?.trim());
}

// 회사 소스(wikidata) 회차 안에서 도는 보강이라 오류 꼬리표를 그 소스로 단다 — IGDB 는 수집 소스(sourceEnum)가 아니다
const http = createHttpClient({ source: "wikidata", label: "IGDB" });

export interface IgdbSession {
  searchCompanies(name: string): Promise<IgdbCompanyRaw[]>;
}

/** apicalypse 문자열 안의 따옴표, 역슬래시를 막는다 */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function openIgdbSession(): Promise<IgdbSession> {
  const clientId = process.env[IGDB_CLIENT_ID_ENV]?.trim();
  const secret = process.env[IGDB_CLIENT_SECRET_ENV]?.trim();
  if (!clientId || !secret) throw new AdapterError("IGDB 키가 없어요", "wikidata", false);
  const params = new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "client_credentials" });
  const token = (await http.json(`${IGDB_TOKEN_URL}?${params}`, { method: "POST", context: "token" })) as { access_token: string };
  const headers = { "Client-ID": clientId, Authorization: `Bearer ${token.access_token}` };
  return {
    async searchCompanies(name) {
      const body =
        "fields name,country,start_date,description,logo.image_id,websites.url,websites.type,developed.name,published.name;" +
        ` where name ~ ${quote(name)}; limit ${IGDB_CANDIDATE_LIMIT};`;
      return (await http.json(IGDB_COMPANIES_URL, { method: "POST", body, headers, context: `company:${name}` })) as IgdbCompanyRaw[];
    },
  };
}
