/** 예외 → 사람이 읽을 메시지. Error 가 아닌 값이 throw 되는 경우(문자열, 객체)까지 한 곳에서 처리한다 */

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
