// SNS 공유 이미지(OG) 공통 상수.
// 크기, 안전영역, 폰트 조달 방법처럼 여러 opengraph-image 라우트가 공유하는 값만 둔다.

/** OG 표준 크기. 트위터 summary_large_image 도 같은 비율을 쓴다 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_CONTENT_TYPE = "image/png";

/**
 * 카카오톡은 썸네일의 좌우를 잘라내고 가운데만 보여준다.
 * 제목, 가격처럼 반드시 읽혀야 하는 것은 이 폭 안에 둔다.
 */
export const OG_SAFE_WIDTH = 800;

/** 바깥 여백 */
export const OG_PADDING = { x: 70, y: 62 } as const;

/**
 * 한글 폰트 조달.
 * satori(ImageResponse) 기본 폰트에는 한글 글리프가 없어서 직접 넘겨야 하는데,
 * Noto Sans KR 전체는 수 MB 라 레포에 넣을 수 없다.
 * 그래서 구글 폰트의 text= 서브셋을 쓴다 — 실제로 그릴 글자만 담긴 수 KB 짜리 파일이 온다.
 */
export const OG_FONT_FAMILY = "Noto Sans KR";
export const OG_FONT_CSS_ENDPOINT = "https://fonts.googleapis.com/css2";

/** 본문용, 제목용 두 굵기만 쓴다. 굵기를 늘리면 그만큼 요청이 늘어난다 */
export const OG_FONT_WEIGHTS = [500, 700] as const;

/**
 * 이 User-Agent 여야 구글이 woff2 대신 truetype 을 돌려준다.
 * satori 는 woff2 를 읽지 못한다 — 최신 UA 로 요청하면 폰트가 통째로 무시되고 한글이 빈칸으로 나온다.
 */
export const OG_FONT_LEGACY_UA = "Mozilla/5.0 (Windows NT 6.1)";

/** 서브셋 응답에서 폰트 파일 주소를 뽑는 패턴 */
export const OG_FONT_SRC_PATTERN = /src:\s*url\((https:\/\/[^)]+)\)/;
