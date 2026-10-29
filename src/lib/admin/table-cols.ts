// 관리자 표의 칸 틀 — 화면(page.tsx)과 그 화면의 뼈대(loading.tsx)가 같은 값을 써야 한다.
// 페이지 파일 안에 두었을 때는 뼈대가 숫자를 베껴야 했다. 칸 하나를 고치면 뼈대만 옛 칸으로 남아
// 본문이 올 때 줄이 옆으로 밀린다 — 그래서 한 곳으로 뺐다(2026-10-08).
// 전부 md: 접두인 이유는 components/admin/data-rows.tsx 머리 주석에 있다 — 좁은 화면에서 이 줄은 표가 아니라 카드다.

/** 게임 수정 화면의 스토어 연결, 고친 기록 — 좁은 화면에서는 한 줄이 카드 한 장이다 */
export const GAME_REF_COLS = "md:grid-cols-[110px_minmax(0,1fr)_minmax(0,1.4fr)_110px_78px_150px] md:gap-x-3 md:px-3 md:py-2";
export const GAME_HISTORY_COLS = "md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_70px] md:gap-x-3 md:px-3 md:py-2";
