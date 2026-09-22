// 검수 큐의 줄 모양. 매칭 대기(/admin/matches)와 상품 매핑(/admin/products)이 같은 뼈대를 쓴다.
//
// 넓은 화면은 칸이 줄 맞춰 선 표고, 좁은 화면은 **한 줄이 곧 한 장의 카드**다.
//
// 왜 가로로 밀게 두지 않았나(2026-09-22): 두 큐는 관리자가 유일하게 **누르는** 화면이다.
// 하는 일은 두 이름을 맞대 보고 맞다/아니다를 고르는 것 하나인데, 960px 짜리 표를 390px 화면에서
// 밀면 우리 제목과 판정 버튼이 절대 같은 화면에 서지 않는다 — 이름을 보고, 밀고, 버튼을 누르고,
// 되밀어 다음 줄을 찾는 왕복이 줄마다 생긴다. 읽기만 하는 표(실행 로그)는 밀어도 되지만
// 판정하는 표는 그러면 안 된다.
//
// 칸 폭은 화면마다 다르므로 `cols`(그리드 칸 선언)를 밖에서 받는다. 그 선언은 전부 `md:` 접두여서
// 좁은 화면에서는 아무 일도 하지 않는다 — 카드일 때의 모양은 이 파일이 혼자 정한다.
import { cn } from "@/lib/cn";

/** 표의 머리. 카드로 눕는 좁은 화면에서는 사라진다 — 값마다 제 이름표를 달고 서기 때문이다 */
export function QueueHead({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className={cn("hidden border-b border-line text-[11.5px] text-dim md:grid", cols)}>
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

export function QueueList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line-soft">{children}</ul>;
}

export function QueueRow({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    // 좁은 화면의 여백만 여기서 정한다 — md 쪽 여백은 cols 가 들고 있다.
    // 같은 속성을 두 군데서 선언하면 cn 이 그저 이어 붙이므로(tailwind-merge 를 쓰지 않는다)
    // 어느 쪽이 이길지가 클래스 순서가 아니라 생성된 CSS 순서에 달리게 된다
    <li className={cn("flex flex-col gap-2 py-3.5 text-[13px] text-ink md:grid md:items-center md:gap-y-0", cols)}>{children}</li>
  );
}

/**
 * 값 한 칸. 좁은 화면에서만 이름표가 왼쪽에 선다 — 표 머리가 없어진 자리를 대신한다.
 * `label` 을 주지 않는 칸(판정 버튼)은 카드에서도 이름표 없이 제 자리만 차지한다.
 */
export function QueueCell({ label, className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 items-baseline gap-2.5 md:block", className)}>
      {label && <span className="w-[74px] shrink-0 text-[11.5px] text-dim md:hidden">{label}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
