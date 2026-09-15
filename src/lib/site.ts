// 서비스 아이덴티티 단일 소스.
// 이름, 설명, 색, 연락처는 여기서만 정의한다 — layout metadata / manifest / Service Worker / 크롤러 UA 가
// 각자 문자열을 들고 있으면 이름을 바꿀 때 한 군데가 반드시 남는다(실제로 theme_color 가 서로 어긋나 있었다).
// public/sw.js 는 번들에 포함되지 않아 import 할 수 없으므로, 그쪽 값은 이 파일과 수동으로 맞춘다(주석으로 표시).

/** 서비스를 한 문장으로. 공유 이미지 제목이 이 문장이다 */
const HEADLINE = "게임 가격, 플레이타임, 평점, 뉴스를 한 곳에서";
/** 무엇이 다른지 한 마디로 */
const TAGLINE = "플랫폼별 할인 알림";

export const SITE = {
  /** 브랜드 표기 — UI, PWA, 문서에 그대로 노출된다 */
  name: "gamearound",
  headline: HEADLINE,
  tagline: TAGLINE,
  /** 검색결과, SNS 카드용 한 줄 설명. 두 문장을 합쳐 쓴다 */
  description: `${HEADLINE}. ${TAGLINE}.`,
  /** 페이지 타이틀 템플릿 (Next metadata.title.template) */
  titleTemplate: "%s | gamearound",
  locale: "ko",
  /** 저작권 표기의 시작 연도. 푸터가 매년 바뀌지 않도록 연도는 렌더 시점에 붙인다 */
  foundedYear: 2026,
  repoUrl: "https://github.com/wlsdlstjdwls/gamearound",
  contactEmail: "wlsdlstjdwls12@gmail.com",
  /** PWA, 브라우저 UI 색. globals.css 의 --bg / --ink 와 같은 값이어야 한다 */
  themeColor: "#1c1c1a",
  backgroundColor: "#faf9f7",
  /** 다크에서의 바탕. globals.css 다크 블록의 --bg 와 같은 값 */
  backgroundColorDark: "#131312",
  /** 브랜드 악센트. globals.css 의 --acc 와 같은 값 — 로고, 아이콘의 버튼 하나가 이 색이다 */
  accentColor: "#5b34c7",
} as const;

/** 크롤러 User-Agent (설계서 §10: 신원, 연락처 명시) */
export const CRAWLER_USER_AGENT = `gamearoundBot/0.1 (+${SITE.repoUrl}; game price aggregator; contact: ${SITE.contactEmail})`;
