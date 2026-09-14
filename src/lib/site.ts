// 서비스 아이덴티티 단일 소스.
// 이름·설명·색·연락처는 여기서만 정의한다 — layout metadata / manifest / Service Worker / 크롤러 UA 가
// 각자 문자열을 들고 있으면 이름을 바꿀 때 한 군데가 반드시 남는다(실제로 theme_color 가 서로 어긋나 있었다).
// public/sw.js 는 번들에 포함되지 않아 import 할 수 없으므로, 그쪽 값은 이 파일과 수동으로 맞춘다(주석으로 표시).

export const SITE = {
  /** 브랜드 표기 — UI·PWA·문서에 그대로 노출된다 */
  name: "gamearound",
  description: "게임 가격·플레이타임·평점·뉴스를 한 곳에서. 플랫폼별 할인 알림.",
  /** 페이지 타이틀 템플릿 (Next metadata.title.template) */
  titleTemplate: "%s | gamearound",
  /** 수집 데이터의 성격을 알리는 고지 — 푸터·약관 동의문에서 공유한다 */
  dataDisclaimer: "가격·정보는 각 스토어와 외부 소스에서 주기적으로 수집되며 실시간이 아닙니다.",
  locale: "ko",
  repoUrl: "https://github.com/wlsdlstjdwls/gamearound",
  contactEmail: "admin@example.com",
  /** PWA·브라우저 UI 색. globals.css 의 --bg / --ink 와 같은 값이어야 한다 */
  themeColor: "#1c1c1a",
  backgroundColor: "#faf9f7",
} as const;

/** 크롤러 User-Agent (설계서 §10: 신원·연락처 명시) */
export const CRAWLER_USER_AGENT = `gamearoundBot/0.1 (+${SITE.repoUrl}; game price aggregator; contact: ${SITE.contactEmail})`;
