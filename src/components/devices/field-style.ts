// 기기 입력칸 차림 — 비회원 기기 폼과 온보딩 기기 단계가 같이 쓴다(규약 §3, 두 곳이 되어 뽑았다).
//
// 공용 TextField 와 같은 차림이다(흰 면 + 헤어라인, 포커스에서 브랜드 링).
// 컴포넌트를 그대로 쓰지 않는 이유는 글자 크기 하나다: 이 칸들은 16px 여야 한다(iOS 가 그 아래에서 화면을 당긴다).
// cn 은 단순 이어붙이기라 TextField 의 14px 를 밖에서 못 덮는다 — 같은 값을 여기 한 번 적는다.
export const FIELD_CLASS =
  "h-[46px] w-full rounded-xl bg-surface px-3.5 text-[16px] text-ink outline-none transition-[box-shadow] duration-base ease-standard " +
  "shadow-[0_0_0_1px_var(--line)] placeholder:text-dim focus:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]";

/** 칸 이름. TextField 의 라벨과 같은 크기, 같은 색이다 */
export const LABEL_CLASS = "mb-1.5 block text-[12.5px] font-medium text-mut";

/** 칸 밑 한 줄(무엇을 조심하라는 말). 그 칸에만 해당하는 말이라 칸 밑에 붙인다 */
export const HINT_CLASS = "mt-1.5 text-[11.5px] leading-[1.6] text-dim";
