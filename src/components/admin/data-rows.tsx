// 관리자 화면의 값 줄. **넓은 화면은 칸이 줄 맞춰 선 표, 좁은 화면은 한 줄이 곧 한 장의 카드**다.
//
// 관리자 화면 다섯 곳(매칭 대기, 상품 매핑, 실행 로그, 회사 이름, 게임 고치기의 표 둘)이 이것을 쓴다.
//
// **왜 가로로 미는 표를 버렸나**(2026-09-22): 처음에는 최소 폭을 주어 가로로 밀게 했다.
// 화면 밖으로 넘치지는 않았지만(문서 폭은 멀쩡했다) 쓰는 사람에게는 같은 문제였다 —
// 390px 화면에서 980px 표를 보려면 한 줄을 읽을 때마다 좌우로 왕복해야 하고,
// 그 사이 어느 줄을 보고 있었는지를 스스로 기억해야 한다. 판정 버튼이 붙은 표에서는
// 이름과 버튼이 아예 같은 화면에 서지 못한다.
// 카드로 눕히면 값마다 제 이름표를 달고 세로로 선다 — 미는 일도, 잘리는 글자도 없다.
//
// 칸 폭은 화면마다 다르므로 `cols`(그리드 칸 선언)를 밖에서 받는다. 그 선언은 전부 `md:` 접두여서
// 좁은 화면에서는 아무 일도 하지 않는다 — 카드일 때의 모양은 이 파일이 혼자 정한다.
//
// **한 속성은 한 곳에서만 정한다.** cn 은 tailwind-merge 가 아니라 단순 이어붙이기라,
// 같은 속성을 이 파일과 `cols` 양쪽에서 선언하면 어느 쪽이 이길지가 클래스 순서가 아니라
// 생성된 CSS 순서에 달리게 된다. 그래서 md 쪽 여백은 `cols` 가, 좁은 화면 여백은 이 파일이 갖는다.
import { cn } from "@/lib/cn";

/** 표의 머리. 카드로 눕는 좁은 화면에서는 사라진다 — 값마다 제 이름표를 달고 서기 때문이다 */
export function DataHead({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className={cn("hidden border-b border-line text-[11.5px] text-dim md:grid", cols)}>
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

export function DataList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line-soft">{children}</ul>;
}

export function DataRow({
  cols,
  /** 넓은 화면에서 칸을 세로 어디에 맞출지. 값이 여러 줄이 되는 표(고친 기록)는 위에 맞춘다 */
  align = "center",
  children,
}: {
  cols: string;
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 py-3.5 text-[13px] text-ink md:grid md:gap-y-0",
        align === "center" ? "md:items-center" : "md:items-start",
        cols,
      )}
    >
      {children}
    </li>
  );
}

/**
 * 값 한 칸. 좁은 화면에서만 이름표가 왼쪽에 선다 — 표 머리가 없어진 자리를 대신한다.
 * `label` 을 주지 않는 칸(판정 버튼)은 카드에서도 이름표 없이 제 자리만 차지한다.
 *
 * 이름표 폭을 고정하는 이유: 카드 안에서 값의 시작점이 줄마다 다르면 훑어 내려가며 읽을 수 없다.
 * 88px 은 이 화면들에서 가장 긴 이름표("스토어가 준 제목")가 두 줄로 접히지 않는 폭이다.
 */
export function DataCell({ label, className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 items-baseline gap-2.5 md:block", className)}>
      {label && <span className="w-[88px] shrink-0 text-[11.5px] leading-[1.5] text-dim md:hidden">{label}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
