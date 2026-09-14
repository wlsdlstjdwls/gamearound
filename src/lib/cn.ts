// 클래스 합치기 — falsy 제거. clsx 의존성 없이 충분 (조건부 문자열만 쓴다)
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(" ");
}
