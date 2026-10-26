// 꼭 채워야 하는 칸 이름 옆의 작은 "필수" 표시(목업 wpage 의 .req). 글쓰기의 칩 묶음(fieldset legend), 한 줄 칸(TextField 의 labelMark),
// 여러 줄 칸 이름표가 같이 쓴다(AGENTS §3).
// 별표(*)가 아니라 낱말로 쓴다 — 별표는 낭독기가 "별" 로 읽거나 건너뛰고, 처음 보는 사람에게는 뜻이 없다. 낱말은 이름표에 붙어 그대로 읽힌다.
// "use client" 를 붙이지 않는다: 상태가 없어 서버 화면에서도 그대로 쓴다. 문구는 부르는 쪽 messages 에서 받는다.
export function RequiredMark({ children }: { children: string }) {
  return <span className="ml-1.5 text-[11.5px] font-semibold text-acc">{children}</span>;
}
