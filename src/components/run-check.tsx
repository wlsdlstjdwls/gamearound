// "돌아가나" 마디 — 판정(내 PC 로 돌아갈까요)과 근거(구동 사양)를 **한 덩어리로** 접고 편다.
//
// 왜 하나로 묶었나(2026-09-21): 아침에 좌우 두 기둥으로 갈라 놓고 보니 둘이 남남처럼 보였다.
// 왼쪽은 안 접히는 마디 제목이고 오른쪽은 접히는 마디 제목이라 생김새부터 달랐고(오른쪽만 세모와
// 누름 면이 있다), 제목 줄의 높이가 달라 두 기둥의 첫 글자 기준선도 어긋났다.
// 그런데 이 둘은 원래 한 질문의 결론과 근거다 — 따로 접히면 근거만 펴 놓거나 결론만 펴 놓는,
// 아무도 원하지 않는 상태가 만들어진다.
//
// **맞추는 방법**: 요약 줄과 본문이 *같은 격자 상수*(GRID)를 쓴다. 그래서 왼쪽 제목의 시작점은
// 왼쪽 본문의 시작점과, 오른쪽 제목은 오른쪽 본문과 정확히 같은 x 에 선다.
// 세모는 격자 밖에 절대 위치로 띄운다 — 격자 안에 넣으면 그만큼 칸이 줄어 본문과 어긋나고,
// 좁은 화면에서 둘째 칸이 사라질 때 세모까지 같이 사라진다.
// 요약 줄의 좌우 여백(-mx + px)은 서로 상쇄되므로 격자 폭은 본문 격자와 같다.
//
// 좁은 화면(lg 아래)에서는 기둥이 하나라 오른쪽 제목을 요약 줄에서 뺀다 — 거기 두면 제목 둘이
// 붙어 선 뒤 본문 둘이 이어져, 둘째 제목이 제 본문에서 화면 하나만큼 떨어진다.
// 대신 그 제목을 오른쪽 본문 바로 위에 세운다.
import { ChevronDownIcon } from "@/components/ui/icons";
import { SECTION_SIZE } from "@/components/ui/page";
import { cn } from "@/lib/cn";

/** 요약 줄과 본문이 **반드시** 같은 값을 써야 두 기둥이 맞는다. 한 곳에서만 고친다 */
/**
 * 판정 칸은 300px 고정, 나머지를 사양표가 다 쓴다(2026-11-23 사용자 "구동 사양 영역이 더 넓으면" 세 번째: 5 : 7, 1 : 2 다음).
 * 사양표는 최소, 권장 두 칸에 긴 부품 이름이 서고, 판정은 짧은 줄뿐이다. 300px 은 부위 줄(이름, 내 부품, 결과)이 접히지 않는 폭이다
 */
const GRID = "grid min-w-0 items-start gap-x-8 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)]";

function Title({ id, title, note }: { id: string; title: string; note?: React.ReactNode }) {
  return (
    // 제목과 곁말은 한 줄이다(2026-11-23 사용자 "충족/미충족 뱃지가 줄바꿈된다") — 곁말은 접지 않고, 넘치면 제목 쪽이 줄어든다
    <span className="flex min-w-0 flex-nowrap items-baseline gap-x-2.5">
      {/* summary 안이라 h2 를 쓴다 — 마디 제목의 격은 다른 마디와 같아야 한다(SECTION_SIZE) */}
      <h2 id={id} className={SECTION_SIZE.section}>
        {title}
      </h2>
      {note && <span className="shrink-0 whitespace-nowrap text-[13px] text-dim">{note}</span>}
    </span>
  );
}

export function RunCheck({
  verdictTitle,
  verdictNote,
  requirementTitle,
  requirementNote,
  verdict,
  requirements,
  footer,
  defaultOpen = true,
}: {
  verdictTitle: string;
  /** 판정 제목 옆 한 줄 — 지금 어떤 기기로 재고 있는지(devices/device-note). 접힌 채로도 보여야 한다 */
  verdictNote?: React.ReactNode;
  requirementTitle: string;
  /** 제목 옆 회색 문구(어느 OS 사양이 있는지). 접힌 상태에서 "안에 뭐가 있나" 를 말하는 자리다 */
  requirementNote?: string;
  verdict: React.ReactNode;
  requirements: React.ReactNode;
  /** 두 기둥 아래 폭 전체에 서는 덧붙임(플랫폼별 성능). 마디와 함께 접힌다(2026-11-23 사용자 "접으면 플랫폼별 성능은 여전히 보인다") */
  footer?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="disclosure group flex flex-col">
      {/* list-none 둘 다 필요하다 — 사파리는 ::-webkit-details-marker 로만 세모를 지운다(Collapsible 과 같은 규칙) */}
      <summary className="tap relative -mx-2.5 block cursor-pointer list-none rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors duration-base hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span className={GRID}>
          <Title id="compat-heading" title={verdictTitle} note={verdictNote} />
          {/* pr-9 는 세모와 글자가 겹치지 않게 띄우는 값이다. 칸의 폭은 안 바뀌므로 본문과 계속 맞는다 */}
          <span className="hidden pr-9 lg:block">
            <Title id="requirements-heading" title={requirementTitle} note={requirementNote} />
          </span>
        </span>
        <span
          aria-hidden
          className="absolute right-2.5 top-2 grid size-7 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2 text-mut transition-colors duration-base group-open:bg-transparent group-open:text-dim"
        >
          <ChevronDownIcon className="size-4 transition-transform duration-base group-open:rotate-180" />
        </span>
      </summary>

      {/* 헤어라인 하나가 두 기둥을 가로질러 지난다 — 이게 "한 영역" 이라는 가장 강한 신호다.
          전에는 기둥마다 제 선을 따로 그어 두 개의 표로 읽혔다 */}
      <div className={cn(GRID, "border-t border-line-strong pt-4")}>
        <div className="min-w-0">{verdict}</div>
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="lg:hidden">
            <Title id="requirements-heading-narrow" title={requirementTitle} note={requirementNote} />
          </div>
          {requirements}
        </div>
      </div>
      {footer && <div className="mt-6">{footer}</div>}
    </details>
  );
}
