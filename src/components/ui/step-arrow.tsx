"use client";
// 이전/다음 한 칸 단추 — 달 고르기 스테퍼의 양 끝(명예의 전당 month-stepper, 출시 예정 upcoming-month-nav).
//
// 두 화면이 같은 문법(왼쪽 이전 | 가운데 이름 | 오른쪽 다음)을 쓰게 되어 뽑았다(2026-11-20, AGENTS 3장 "2곳이면 추출").
// 갈 곳이 있으면 NavChip 이라 누른 순간 켜지고(같은 group 의 고른 값을 가운데 이름이 useNavPicked 로 먼저 읽는다),
// 갈 곳이 없으면 같은 크기의 흐린 칸이 자리를 지킨다 — 칸이 사라지면 가운데 이름이 옆으로 밀려 달마다 흔들린다.
// 화살표 글자 대신 chevron 그림이고, 이름(sr)은 부르는 쪽이 준다("이전 달", "다음 달").
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NavChip } from "@/components/ui/nav-pending";

export function StepArrow({ dir, href, group, label }: { dir: "prev" | "next"; href?: string; group: string; label: string }) {
  const icon = <ChevronLeftIcon size={16} className={dir === "next" ? "rotate-180" : undefined} />;
  if (href) {
    return (
      <NavChip group={group} href={href} aria-label={label} size="page">
        {icon}
      </NavChip>
    );
  }
  // 막힌 칸 — 링크가 아니라 누를 수 없는 표시다. 낭독기에는 "이전 달, 사용할 수 없음" 으로 읽힌다
  return (
    <span role="link" aria-disabled="true" aria-label={label} className="grid h-8 w-10 place-items-center text-line-strong">
      {icon}
    </span>
  );
}
