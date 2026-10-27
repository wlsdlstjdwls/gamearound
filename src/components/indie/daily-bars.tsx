"use client";
// 날짜별 막대(메이커 멤버십 통계 자세히, 2026-10-27). 한 그래프에 숫자 하나 — 조회와 플레이하기 클릭은 크기가 달라 두 그래프로 나눈다
// (한 판에 축 둘을 세우면 어느 막대가 어느 축인지 읽는 사람이 맞힌다).
//
// 막대 위에 숫자를 다 적지 않는다. 대신 머리 줄이 읽기 자리다: 평소엔 기간 합, 막대를 가리키거나 누르면 그날 값.
// 막대 칸 전체(위 빈 곳 포함)가 가리키는 자리라 낮은 막대도 잡힌다. 표 보기는 화면 읽기 프로그램용으로 같은 값을 숨은 표로 둔다.
import { useState } from "react";
import { cn } from "@/lib/cn";

/** 막대 판 높이(px). 30칸이 좁은 화면에서도 모양을 알아볼 만한 높이 */
const CHART_HEIGHT = 120;

const fmt = (n: number) => n.toLocaleString("ko-KR");
/** "2026-10-27" 를 "10월 27일" 로. 날짜 문자열을 그대로 자른다 — Date 로 바꾸면 시간대에 따라 하루 밀린다 */
const dayLabel = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

export function DailyBars({ title, totalLabel, points }: { title: string; totalLabel: string; points: Array<{ day: string; value: number }> }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((s, p) => s + p.value, 0);
  const shown = active === null ? null : points[active];

  return (
    <figure className="relative flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-bold text-ink">{title}</span>
        <span aria-live="polite" className="text-[13px] tabular-nums text-mut">
          {shown ? `${dayLabel(shown.day)} | ${fmt(shown.value)}` : `${totalLabel} ${fmt(total)}`}
        </span>
      </figcaption>
      <div aria-hidden className="flex items-end gap-[2px] border-b border-line" style={{ height: CHART_HEIGHT }} onPointerLeave={() => setActive(null)}>
        {points.map((p, i) => (
          <div key={p.day} className="flex h-full flex-1 items-end" onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)}>
            <div
              className={cn("w-full rounded-t-[4px] transition-colors", p.value === 0 ? "bg-line" : active === i ? "bg-acc" : "bg-acc/70")}
              style={{ height: p.value === 0 ? 2 : `${Math.max((p.value / max) * 100, 3)}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-[11.5px] tabular-nums text-dim">
        <span>{points[0] && dayLabel(points[0].day)}</span>
        <span>{points.at(-1) && dayLabel(points.at(-1)!.day)}</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th scope="row">{dayLabel(p.day)}</th>
              <td>{fmt(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
