// "돌아가나" 마디 — 구동 사양표와 내 PC 판정을 **한 표로** 접고 편다(2026-11-23 사용자 "내 PC 구동 확인, 구동 사양을 합쳐서").
//
// 2026-09-21 부터 판정(왼쪽 300px)과 사양표(오른쪽)를 두 기둥으로 묶어 왔다. 같은 부품(프로세서, 그래픽)을 왼쪽에서 내 값으로,
// 오른쪽에서 요구값으로 두 번 읽어야 했다 — 지금은 사양표 맨 오른쪽 "내 PC" 칸이 같은 줄에서 답한다(compat-section, requirements-table).
//
// **머리는 접든 펴든 같은 모양이다**(같은 날 사용자 "접었다 펼칠 때마다 구동 사양 위치가 바뀌고 옆 정보가 사라졌다 생겼다").
// 전에는 접히면 한 줄 흐름(flex), 펴면 본문과 같은 격자(grid)로 바뀌고 부품 칩은 접힌 때만 보였다 — 누를 때마다 제목이 옮겨 다녔다.
// 이제 [제목, 판정 한 마디, 여닫기 단추] 한 줄 그대로이고 바뀌는 것은 세모의 방향뿐이다.
import { DisclosureToggle } from "@/components/ui/collapsible";
import { SECTION_SIZE } from "@/components/ui/page";

export function RunCheck({
  title,
  note,
  children,
  footer,
  defaultOpen = true,
}: {
  title: string;
  /** 제목 옆 판정 한 마디(devices/verdict-note). 접힌 채로도 결론을 말한다 */
  note?: React.ReactNode;
  /** 판정 기기 줄 + 사양표(내 PC 칸 포함) */
  children: React.ReactNode;
  /** 표 아래 폭 전체에 서는 덧붙임(플랫폼별 성능). 마디와 함께 접힌다(2026-11-23 사용자 "접으면 플랫폼별 성능은 여전히 보인다") */
  footer?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="disclosure group flex flex-col">
      {/* list-none 둘 다 필요하다 — 사파리는 ::-webkit-details-marker 로만 세모를 지운다(Collapsible 과 같은 규칙) */}
      {/* 머리는 한 단계 작은 제목(sub)에 위아래 여백을 줄였다(2026-11-23 사용자 "글자가 너무 크고 펼치기 전 위아래 공백이 너무 크다") —
          탭 판 안의 마디라 화면 마디 제목(section, 25px) 크기는 넘쳤다 */}
      <summary className="tap -mx-2.5 flex cursor-pointer list-none items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors duration-base hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <h2 id="compat-heading" className={SECTION_SIZE.sub}>
          {title}
        </h2>
        {note && <span className="flex min-w-0 items-center whitespace-nowrap text-[13px]">{note}</span>}
        <DisclosureToggle className="ml-auto size-8" />
      </summary>
      <div className="mt-2 flex min-w-0 flex-col gap-3.5 border-t border-line-strong pt-4">{children}</div>
      {footer && <div className="mt-6">{footer}</div>}
    </details>
  );
}
