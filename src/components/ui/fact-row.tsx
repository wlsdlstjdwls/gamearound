// 이름표 + 값 한 줄 — "플레이 | 솔로, 협동" 처럼 왼쪽 옅은 이름표가 무엇에 대한 값인지 먼저 말한다.
//
// 2026-11-23 사용자 "장르, 지원 여부 등 다 똑같이 표현하니까 눈에 안 들어옴": 게임 상세 커버 밑에 플레이 방식, 스팀덱, 맥, 한국어가
// 모두 같은 회색 알약으로 늘어서 바로 위 장르 알약과 한 덩어리였다. 알약은 장르(누르면 목록으로 가는 것)에만 남기고,
// 사실 값은 면 없는 글자 줄로 바꿔 갈래 이름표를 앞에 세웠다. 세 줄이 같은 꼴이라 여기로 뽑았다(규약 §3).
// 값이 없어도 줄은 늘 선다(같은 날 사용자 "값이 없어도 항상 노출, - 로") — 게임마다 줄 수가 달라 어느 칸이 빠졌는지 안 보였다.

/** 값이 없는 줄의 자리 */
export function FactEmpty() {
  return <span className="text-dim-2">-</span>;
}

export function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3 text-[13px] leading-[1.5]">
      <dt className="w-[52px] shrink-0 text-[12px] font-medium text-dim">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-ink-2">{children}</dd>
    </div>
  );
}
