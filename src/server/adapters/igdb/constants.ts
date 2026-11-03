// IGDB(Twitch) 엔드포인트와 한계. 값의 근거는 2026-11-03 api-docs.igdb.com 과 실측이다.
//
// 이용 조건: IGDB API 는 **비상업용 무료**다(Twitch Developer Service Agreement). 상업용은 partner@igdb.com 제휴가 따로 있다.
// 손전등은 유료 상품이 있어 오픈 전에 제휴를 확인해야 한다 — 그 전까지는 개발 단계 시험용이다.

export const IGDB_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
export const IGDB_COMPANIES_URL = "https://api.igdb.com/v4/companies";
/** Twitch 개발자 콘솔에서 받은 앱 키. 둘 중 하나라도 비면 IGDB 보강을 건너뛴다 */
export const IGDB_CLIENT_ID_ENV = "IGDB_CLIENT_ID";
export const IGDB_CLIENT_SECRET_ENV = "IGDB_CLIENT_SECRET";

/** 초당 4건이 한도다(문서). 넘으면 429 — 간격을 두어 한 줄로 보낸다 */
export const IGDB_REQUEST_GAP_MS = 300;
/** 이름 하나에 받을 후보 수. 정확 일치(~)로 물으므로 동명 회사가 둘셋이면 충분하다 */
export const IGDB_CANDIDATE_LIMIT = 5;
/** 로고 주소 틀. t_logo_med 는 284px 너비(문서의 이미지 크기 표) */
export const IGDB_LOGO_URL = (imageId: string) => `https://images.igdb.com/igdb/image/upload/t_logo_med/${imageId}.png`;
/** 회사 웹사이트 갈래에서 "공식" 번호(company_websites.type, 옛 category 의 official) */
export const IGDB_WEBSITE_OFFICIAL = 1;

/**
 * IGDB 는 나라를 ISO 3166-1 **숫자** 코드로 준다(실측: 17Studio 398 = 카자흐스탄). 우리 칸은 두 글자 코드다.
 * 게임사가 나올 만한 나라만 둔다 — 표에 없는 번호는 나라를 비워 둔다(틀린 나라를 박는 것보다 낫다).
 */
export const ISO_NUMERIC_TO_ALPHA2: Readonly<Record<number, string>> = {
  8: "AL", 32: "AR", 36: "AU", 40: "AT", 50: "BD", 56: "BE", 70: "BA", 76: "BR", 100: "BG", 112: "BY",
  124: "CA", 152: "CL", 156: "CN", 158: "TW", 170: "CO", 188: "CR", 191: "HR", 196: "CY", 203: "CZ", 208: "DK",
  218: "EC", 233: "EE", 246: "FI", 250: "FR", 268: "GE", 276: "DE", 300: "GR", 344: "HK", 348: "HU", 352: "IS",
  356: "IN", 360: "ID", 364: "IR", 372: "IE", 376: "IL", 380: "IT", 392: "JP", 398: "KZ", 404: "KE", 410: "KR",
  428: "LV", 440: "LT", 442: "LU", 446: "MO", 458: "MY", 470: "MT", 484: "MX", 498: "MD", 499: "ME", 504: "MA",
  528: "NL", 554: "NZ", 566: "NG", 578: "NO", 586: "PK", 604: "PE", 608: "PH", 616: "PL", 620: "PT", 630: "PR",
  642: "RO", 643: "RU", 682: "SA", 688: "RS", 702: "SG", 703: "SK", 704: "VN", 705: "SI", 710: "ZA", 724: "ES",
  752: "SE", 756: "CH", 764: "TH", 784: "AE", 788: "TN", 792: "TR", 804: "UA", 807: "MK", 818: "EG", 826: "GB",
  840: "US", 858: "UY", 860: "UZ", 862: "VE",
};
