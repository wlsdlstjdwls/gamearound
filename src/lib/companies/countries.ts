// 회사 나라 고르기 목록(회사 정보 고치기 화면). 게임사가 나올 만한 나라만 둔다 — IGDB 숫자 코드 표(adapters/igdb/constants)와 같은 범위다.
// 클라이언트도 읽는 목록이라 어댑터에서 가져오지 않고 여기 둔다. 이름은 Intl 로 한국어를 받는다.

export const COMPANY_COUNTRY_CODES = [
  "KR", "JP", "CN", "TW", "HK", "US", "CA", "GB", "FR", "DE", "IT", "ES", "PT", "NL", "BE", "CH", "AT", "SE", "NO", "DK",
  "FI", "IS", "IE", "PL", "CZ", "SK", "HU", "RO", "BG", "GR", "TR", "UA", "BY", "RU", "LT", "LV", "EE", "SI", "HR", "RS",
  "BA", "ME", "MK", "AL", "MD", "GE", "KZ", "UZ", "IL", "AE", "SA", "EG", "MA", "TN", "ZA", "NG", "KE", "IN", "PK", "BD",
  "TH", "VN", "MY", "SG", "ID", "PH", "MO", "AU", "NZ", "MX", "BR", "AR", "CL", "CO", "PE", "UY", "VE", "EC", "CR", "PR",
  "CY", "MT", "LU", "IR",
] as const;

export type CompanyCountryCode = (typeof COMPANY_COUNTRY_CODES)[number];

/** Intl 이 긴 공식 이름을 주는 지역 */
const SHORT_NAME_KO: Readonly<Record<string, string>> = { HK: "홍콩", MO: "마카오" };

export function countryNameKo(code: string): string {
  if (SHORT_NAME_KO[code]) return SHORT_NAME_KO[code];
  try {
    return new Intl.DisplayNames(["ko"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function isCompanyCountryCode(v: string): v is CompanyCountryCode {
  return (COMPANY_COUNTRY_CODES as readonly string[]).includes(v);
}
