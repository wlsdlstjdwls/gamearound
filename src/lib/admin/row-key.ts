// 저장 전 새 줄의 열쇠(2026-10-30). 공통코드, 알림 템플릿 화면이 툴바 입력으로 만든 줄에 붙인다.
// 코드값을 열쇠로 쓰지 않는 이유: 새 줄은 코드값을 치는 동안 값이 바뀌어, 그 값을 그리드 열쇠로 쓰면 칠 때마다 고른 줄이 풀린다.
let seq = 0;

export function newRowKey(prefix: string): string {
  seq += 1;
  return `${prefix}-new-${Date.now().toString(36)}-${seq}`;
}
