// 관리자 표의 칸 틀 — 화면(page.tsx)과 그 화면의 뼈대(loading.tsx)가 같은 값을 써야 한다.
// 페이지 파일 안에 두었을 때는 뼈대가 숫자를 베껴야 했다. 칸 하나를 고치면 뼈대만 옛 칸으로 남아
// 본문이 올 때 줄이 옆으로 밀린다 — 그래서 한 곳으로 뺐다(2026-10-08).
// 전부 md: 접두인 이유는 components/admin/data-rows.tsx 머리 주석에 있다 — 좁은 화면에서 이 줄은 표가 아니라 카드다.

/** 회사 검수 대기 — 좁은 화면에서는 한 이름이 카드 한 장이다 */
export const COMPANY_PENDING_COLS = "md:grid-cols-[minmax(0,1fr)_120px_200px] md:gap-x-3 md:px-3 md:py-2";

/** 매칭 대기. 우리 제목과 스토어 제목을 같은 너비로 나란히 둔다 — 검수자가 두 이름을 눈으로 맞대는 것이 이 화면의 일이다 */
export const MATCH_QUEUE_COLS = "md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_minmax(0,1.4fr)_72px_132px] md:gap-x-3 md:px-4 md:py-[13px]";

/** 상품 매핑. 상품 이름과 후보 게임 제목을 같은 너비로 나란히 둔다 — 두 이름을 눈으로 맞대는 것이 이 화면의 일이다 */
export const PRODUCT_QUEUE_COLS = "md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_64px_minmax(0,1fr)_120px_128px] md:gap-x-3 md:px-4 md:py-[13px]";

/** 게임 수정 화면의 스토어 연결, 고친 기록 — 좁은 화면에서는 한 줄이 카드 한 장이다 */
export const GAME_REF_COLS = "md:grid-cols-[110px_minmax(0,1fr)_minmax(0,1.4fr)_110px_78px_150px] md:gap-x-3 md:px-3 md:py-2";
export const GAME_HISTORY_COLS = "md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_70px] md:gap-x-3 md:px-3 md:py-2";

// 실행 로그. 칸이 아홉이다. 넓은 화면에서만 표로 서고, 좁은 화면에서는 실행 하나가 카드 한 장이 된다.
// 번호는 줄을 가리키는 값이라 맨 앞에 좁게 둔다.
// 에러 맛보기는 칸이 아니라 **줄 밑 한 줄**이다(2026-10-08) — 아홉째 칸으로 두었을 때 남는 폭이 150px 남짓이라
// 고정폭 글자가 낱자로 꺾여 줄 하나가 열 줄로 늘었고, 그 몇 줄이 화면을 먹어 정상 실행이 안 보였다.
// 에러가 있는 줄만 밑에 전체 폭으로 두 줄까지 펴고, 머리 칸은 여덟이다. 숫자 칸은 글자 폭만큼만 준다.
export const SYNC_LOG_COLS = "md:grid-cols-[52px_128px_84px_120px_84px_56px_48px_minmax(0,1fr)] md:gap-x-3 md:px-3 md:py-2.5";
