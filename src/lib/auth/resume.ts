// 로그인 이어하기(기획서 v2.0 4.2, 6.2) — "찜 누름, 로그인, 찜 완료" 를 잇는 메모.
//
// 로그인은 성공하면 페이지를 통째로 다시 연다(use-auth-form 의 location.replace — 헤더, 캐시가 새 세션으로 서야 해서).
// 그래서 "누르던 동작" 을 자바스크립트 변수로는 넘길 수 없다. 탭 단위 저장소(sessionStorage)에 동작 이름만 적어 두고,
// 다시 열린 화면에서 같은 이름의 버튼이 그것을 꺼내 실행한다. 이름에는 대상까지 넣는다(wish:<gameId>) —
// 다른 게임의 찜 버튼이 남의 메모를 집지 않게.
//
// 오래된 메모는 버린다 — 로그인 창을 닫고 한참 뒤 다른 계정으로 들어왔을 때 엉뚱한 찜이 걸리면 안 된다.

const KEY = "gamearound.resume";
/** 로그인 팝업을 열고 비밀번호를 찾아 치기까지 넉넉히 잡은 시간 */
export const RESUME_TTL_MS = 10 * 60 * 1000;

type Memo = { action: string; at: number };

export function rememberAction(action: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ action, at: Date.now() } satisfies Memo));
  } catch {
    // 저장이 막힌 브라우저 — 이어하기만 빠지고 로그인은 그대로 된다
  }
}

/** 이 동작의 메모가 있으면 지우고 true. 다른 동작의 메모는 건드리지 않는다 */
export function takeAction(action: string, now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const memo = JSON.parse(raw) as Memo;
    if (now - memo.at > RESUME_TTL_MS) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    if (memo.action !== action) return false;
    sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

// 쓰던 글 보관 — 댓글처럼 "누르던 동작" 에 사용자가 친 글이 딸린 경우(기획서 6.2 "누르던 동작을 그대로 이어서 실행").
// 동작 메모만으로는 다시 열린 화면에서 보낼 내용이 없다(페이지가 통째로 다시 열려 입력칸이 비었다). 그래서 같은 탭 저장소에
// 동작 이름을 열쇠로 글을 따로 적어 두고, 이어하기가 돌 때 꺼내 칸에 되돌린 뒤 보낸다.
// 동작 메모와 칸을 나눈 이유: 메모는 하나뿐이라(마지막 누른 것) 덮이지만, 글은 동작마다 따로 남아야 다른 글의 댓글 칸이 남의 글을 집지 않는다.
// 수명은 동작 메모와 같다 — 로그인을 포기하고 한참 뒤 돌아온 화면에 옛 글이 튀어나오면 안 된다.

const DRAFT_KEY = "gamearound.resume.draft";

type Draft = { action: string; text: string; at: number };

export function rememberDraft(action: string, text: string): void {
  try {
    sessionStorage.setItem(`${DRAFT_KEY}:${action}`, JSON.stringify({ action, text, at: Date.now() } satisfies Draft));
  } catch {
    // 저장이 막힌 브라우저 — 로그인 뒤 칸이 빈 채로 돌아올 뿐 로그인은 그대로 된다
  }
}

/** 이 동작에 적어 둔 글을 꺼내고 지운다. 없거나 오래됐으면 null */
export function takeDraft(action: string, now = Date.now()): string | null {
  try {
    const key = `${DRAFT_KEY}:${action}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    const draft = JSON.parse(raw) as Draft;
    if (draft.action !== action || now - draft.at > RESUME_TTL_MS) return null;
    return draft.text;
  } catch {
    return null;
  }
}

/** 보낼 필요가 없어진 글을 지운다(로그인한 채 바로 보냈을 때) */
export function forgetDraft(action: string): void {
  try {
    sessionStorage.removeItem(`${DRAFT_KEY}:${action}`);
  } catch {
    // 저장소가 막혔으면 지울 것도 없다
  }
}
