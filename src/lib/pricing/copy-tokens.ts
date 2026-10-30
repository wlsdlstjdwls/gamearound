// 요금 카드 문구의 자리표시(2026-10-29). 저장 값은 {saving} 꼴 그대로 두고(lib/pricing/settings 의 fillCopy 가 읽는다),
// 관리자 화면에서만 {절약금액} 꼴로 바꿔 보인다 — 사용자: "{saving}, {credits} 는 뭐가 뭔지 모르겠다".
// 저장 형식을 바꾸지 않는 이유: 이미 저장된 운영 설정과 요금 화면이 그 꼴을 읽는다. 바꾸면 둘 다 옮겨야 한다.
// 2026-10-30 사용자 "치환변수는 {} 로 통일": 화면 꼴을 [절약 금액] 에서 {절약금액} 으로 — 알림 템플릿({제목})과 같은 문법이다.
// 이름에 띄어쓰기를 두지 않는 것도 알림 템플릿 변수 규칙(lib/notify/template)과 같다. 손으로 친 옛 꼴 [절약 금액] 도 읽는다.
export const COPY_TOKENS = [
  { key: "saving", label: "절약금액", legacy: "절약 금액", hint: "묶음이 낱개 둘보다 싼 만큼(예: 3,900원)" },
  { key: "credits", label: "이용권수", legacy: "이용권 수", hint: "메이커 멤버십이 매달 주는 노출 이용권 장수" },
  { key: "price", label: "낱개값", legacy: "낱개 값", hint: "낱개 광고 값(예: 6,900원)" },
] as const;

/** 저장 꼴 → 화면 꼴. 모르는 {이름} 은 그대로 둔다 */
export function toDisplayCopy(stored: string): string {
  return COPY_TOKENS.reduce((s, t) => s.replaceAll(`{${t.key}}`, `{${t.label}}`), stored);
}

/** 화면 꼴 → 저장 꼴. 옛 화면 꼴([절약 금액])도 같은 자리표시로 읽는다 */
export function fromDisplayCopy(display: string): string {
  return COPY_TOKENS.reduce((s, t) => s.replaceAll(`{${t.label}}`, `{${t.key}}`).replaceAll(`[${t.legacy}]`, `{${t.key}}`), display);
}

/** 넣을 자리표시의 화면 꼴 */
export function displayToken(key: (typeof COPY_TOKENS)[number]["key"]): string {
  return `{${COPY_TOKENS.find((t) => t.key === key)?.label ?? key}}`;
}
