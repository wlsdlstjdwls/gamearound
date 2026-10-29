// 탭 안 문서(iframe)와 바깥 껍데기가 주고받는 말. 같은 출처끼리만 받는다.
// - open: 탭 안에서 다른 프로그램 링크를 눌렀다 — 바깥이 그 탭을 열거나 고른다
// - loc: 탭 안 주소가 바뀌었다(조회조건) — 바깥이 그 탭의 마지막 주소로 기억한다
// - dirty: 탭 안 화면에 저장 안 한 값이 생기거나 없어졌다 — 바깥 탭에 표시하고 닫을 때 묻는다
export type FrameMessage = { type: "admin-open"; href: string } | { type: "admin-loc"; href: string } | { type: "admin-dirty"; dirty: boolean };

/** 이 문서가 탭 안(iframe)에서 열렸나. 레이아웃의 첫 스크립트가 html 에 찍어 둔다 — 그려지기 전에 껍데기를 숨겨야 깜빡이지 않는다 */
export const FRAME_ATTR = "data-admin-frame";
export const FRAME_INIT_SCRIPT = `try{if(window.top!==window.self)document.documentElement.setAttribute(${JSON.stringify(FRAME_ATTR)},"1")}catch(e){document.documentElement.setAttribute(${JSON.stringify(FRAME_ATTR)},"1")}`;

export function inFrame(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute(FRAME_ATTR);
}

export function postToTop(msg: FrameMessage) {
  try {
    window.top?.postMessage(msg, location.origin);
  } catch {
    // 바깥이 다른 출처면 말을 걸지 않는다
  }
}

export function isFrameMessage(data: unknown): data is FrameMessage {
  if (!data || typeof data !== "object") return false;
  const t = (data as { type?: unknown }).type;
  return t === "admin-open" || t === "admin-loc" || t === "admin-dirty";
}
