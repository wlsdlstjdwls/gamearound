// 뉴스 썸네일 주소 서명 — 화면이 쓰는 주소를 우리 출처(/api/news/thumbnail)로 바꾼다.
//
// 왜 프록시인가(2026-09-15 실측): 일부 매체가 이미지를 핫링크로 못 쓰게 막는다.
// videogameschronicle 의 썸네일은 브라우저가 직접 받으면 403 + ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
// (Cross-Origin-Resource-Policy) 으로 떨어진다. 화면은 대체 면으로 받아 깨지지 않지만 그 자리는 늘 비고
// 콘솔은 오류로 찬다. 서버가 대신 받아 같은 출처로 흘려보내면 그 규칙에 걸리지 않는다.
//
// 왜 호스트 화이트리스트가 아니라 서명인가: 저장된 썸네일 호스트가 27개고 꼬리가 길다
// (assetsio.gnwcdn.com 364건 ... s3-b3bucket 1건, 2026-09-15 실측). 피드가 바뀌면 또 늘어 목록은 바로 낡는다.
// 서명은 "우리가 그린 화면에서 나온 주소" 만 통과시켜, 남의 파일을 날라 주는 공짜 프록시가 되는 것을 막는다.
import { createHmac, timingSafeEqual } from "node:crypto";
import { ROUTES } from "@/lib/routes";

/** 서명 키로 빌려 쓰는 환경변수. 크롤러가 이미 쓰는 값이라 배포마다 이미 들어 있다 — 새 설정이 늘지 않는다 */
const SIGNING_SECRET_ENV = "CRAWL_SECRET";

/** 서명 길이(hex 자릿수). 16자 = 64비트, 주소마다 값이 달라 맞혀 볼 여지가 없다 */
const SIGNATURE_LENGTH = 16;

export const THUMBNAIL_URL_PARAM = "u";
export const THUMBNAIL_SIGNATURE_PARAM = "s";

/**
 * 서버가 대신 받아도 열리지 않는 호스트 — 아예 그리지 않는다.
 *
 * 왜 목록을 두나(2026-09-15 실측, 저장된 27개 호스트 전수 확인): 이 다섯은 우리 쪽에서도 막힌다.
 * 그냥 두면 썸네일 한 장마다 502 요청이 한 번씩 나가 화면에는 대체 면이 뜨고 콘솔만 오류로 찬다 —
 * 어차피 못 받을 것을 요청하지 않는 편이 조용하다. 나머지 22개 호스트는 프록시로 열린다.
 *   nintendolife, videogameschronicle, steamdb: 헤더를 어떻게 바꿔도 403 (매체 쪽 차단)
 *   netease: 500 (원본이 죽었다)
 *   staticflickr: 우리 크롤러 UA 를 403 으로 막는다 — 브라우저 흉내를 내면 열리지만 신원을 속이지 않는다(§10)
 */
const BLOCKED_THUMBNAIL_HOSTS: ReadonlySet<string> = new Set([
  "images.nintendolife.com",
  "www.videogameschronicle.com",
  "steamdb.info",
  "office.netease.com",
  "live.staticflickr.com",
]);

/**
 * 저장된 주소를 부를 수 있는 형태로 고친다.
 * 프로토콜 없는 주소("//img.ruliweb.com/...")를 https 로 채우는 이유: 예전에는 브라우저가 화면 프로토콜로
 * 알아서 채워 줬는데, 서버가 대신 받으려면 우리가 채워야 한다(실측: 루리웹 썸네일이 이 형태로 저장돼 있다).
 * http, https 가 아닌 것(data:, javascript:)은 null — 프록시로 내보낼 주소가 아니다.
 */
export function normalizeThumbnailUrl(raw: string): string | null {
  const candidate = raw.startsWith("//") ? `https:${raw}` : raw;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * 바이트 앞머리로 이미지 종류를 알아낸다.
 * 왜 필요한가(2026-09-15 실측): 게임메카 CDN 은 멀쩡한 jpg 를 application/octet-stream 으로 준다.
 * 선언만 믿으면 그 매체 썸네일이 통째로 빠지고, 그렇다고 아무 바이트나 흘려보내면 우리 출처로
 * HTML, 스크립트를 배달하게 된다 — 아는 그림 형식일 때만 통과시킨다.
 */
export function sniffImageType(bytes: ArrayBuffer): string | null {
  const b = new Uint8Array(bytes);
  const at = (i: number, ...sig: number[]) => sig.every((v, k) => b[i + k] === v);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  // RIFF....WEBP — 크기 4바이트를 건너뛰고 8번째부터가 형식 이름이다
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  // ....ftypavif — 앞 4바이트는 박스 길이라 건너뛴다
  if (at(4, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66)) return "image/avif";
  return null;
}

/** 주소의 서명. 시크릿이 없으면(로컬에 값을 안 넣은 경우) null — 그때는 원본 주소를 그대로 쓴다 */
export function thumbnailSignature(url: string, secret: string | undefined = process.env[SIGNING_SECRET_ENV]): string | null {
  if (!secret) return null;
  return createHmac("sha256", secret).update(url).digest("hex").slice(0, SIGNATURE_LENGTH);
}

/** 제시된 서명이 맞는지 상수 시간으로 본다(lib/secret 과 같은 규칙) */
export function thumbnailSignatureMatches(
  url: string,
  provided: string | null | undefined,
  secret: string | undefined = process.env[SIGNING_SECRET_ENV],
): boolean {
  const expected = thumbnailSignature(url, secret);
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * 화면에 넣을 썸네일 주소. 그릴 수 없는 주소면 null — 호출부가 대체 면을 놓는다.
 * 서명할 수 없으면(시크릿 없는 로컬) 원본 주소를 그대로 준다 — 막지 않는 매체가 대부분이라,
 * 썸네일이 통째로 빠지는 것보다 낫다.
 */
export function newsThumbnailSrc(url: string, secret: string | undefined = process.env[SIGNING_SECRET_ENV]): string | null {
  const normalized = normalizeThumbnailUrl(url);
  if (!normalized) return null;
  if (BLOCKED_THUMBNAIL_HOSTS.has(new URL(normalized).host)) return null;
  const sig = thumbnailSignature(normalized, secret);
  if (!sig) return normalized;
  const q = new URLSearchParams({ [THUMBNAIL_URL_PARAM]: normalized, [THUMBNAIL_SIGNATURE_PARAM]: sig });
  return `${ROUTES.apiNewsThumbnail}?${q.toString()}`;
}
