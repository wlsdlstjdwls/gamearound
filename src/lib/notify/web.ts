// 웹 알림 템플릿 채우기(2026-11-02, 사용자 "웹 알림도 추가"). 웹 알림은 알림함(헤더 종) 한 줄이다 — 화면이 글자로 그리므로 꾸밈 태그를 쓰지 않는다.
// 변수 문법은 다른 수단과 같다({이름}, lib/notify/template). 값은 이스케이프하지 않은 글로 채운다(React 가 글자로 그린다).
// 줄바꿈은 한 칸으로 접는다 — 알림함 줄과 웹푸시 본문이 한 줄을 기대한다.
import { renderEmailSubject } from "./email";

/** 웹 알림 한 줄 상한. 알림함 팝오버 두 줄, 웹푸시 본문이 잘리지 않는 길이 */
export const WEB_BODY_MAX = 300;

/** 꾸밈 태그가 들어 있나. 웹 알림 본문은 저장 전에 막는다(lib/notify/schemas) */
export function hasMarkup(body: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(body);
}

/** 웹 알림 한 줄. 제목 칸과 같은 채우기(이스케이프 안 함, 공백 한 칸)다 */
export function renderWebNotice(body: string, vars: Readonly<Record<string, string | null | undefined>>): string {
  return renderEmailSubject(body, vars);
}
