// 공유 비밀값 비교. 크롤러(x-crawl-secret), Vercel Cron(Bearer), 진단 라우트가 같은 규칙을 쓴다.
//
// 왜 따로 있나: 세 곳이 각자 비교문을 들고 있으면 한 곳만 단순 === 로 바뀌어도 아무도 모른다.
// 길이 비교를 먼저 하는 이유: timingSafeEqual 은 길이가 다르면 던진다.
import { timingSafeEqual } from "node:crypto";

/**
 * 제시값이 기대값과 같은지 상수 시간으로 본다.
 * 기대값(환경변수)이 비어 있으면 항상 false — 시크릿을 안 넣은 배포가 무방비로 열리지 않게.
 */
export function secretMatches(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "Bearer <값>" 헤더에서 값만 꺼낸다. 형식이 아니면 null */
export function bearerToken(header: string | null | undefined): string | null {
  const prefix = "Bearer ";
  if (!header || !header.startsWith(prefix)) return null;
  return header.slice(prefix.length);
}
