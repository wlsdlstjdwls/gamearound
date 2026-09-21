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
const GRID = "grid min-w-0 items-start gap-x-12 gap-y-6 lg:grid-cols-2";

function Title({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
      {/* summary 안이라 h2 를 쓴다 — 마디 제목의 격은 다른 마디와 같아야 한다(SECTION_SIZE) */}
      <h2 id={id} className={SECTION_SIZE.section}>
        {title}
      </h2>
      {note && <span className="text-[13px] text-dim">{note}</span>}
    </span>
  );
}

export function RunCheck({
  verdictTitle,
  requirementTitle,
  requirementNote,
  verdict,
  requirements,
  defaultOpen = true,
}: {
  verdictTitle: string;
  requirementTitle: string;
  /** 제목 옆 회색 문구(어느 OS 사양이 있는지). 접힌 상태에서 "안에 뭐가 있나" 를 말하는 자리다 */
  requirementNote?: string;
  verdict: React.ReactNode;
  requirements: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group flex flex-col">
      {/* list-none 둘 다 필요하다 — 사파리는 ::-webkit-details-marker 로만 세모를 지운다(Collapsible 과 같은 규칙) */}
      <summary className="tap relative -mx-2.5 block cursor-pointer list-none rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors duration-base hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span className={GRID}>
          <Title id="compat-heading" title={verdictTitle} />
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
    </details>
  );
}
