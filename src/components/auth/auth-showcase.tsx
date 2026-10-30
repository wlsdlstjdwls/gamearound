// 인증 화면 왼쪽 꾸밈(2026-10-30 사용자: "로그인, 회원가입 화면이 너무 밋밋하다").
//
// 셋이다. 바탕에 브랜드 빛 번짐, 로고 손전등에서 제목 쪽으로 뻗는 빛줄기(.torch-cone, 알리기 판과 같은 움직임),
// 그리고 할인 알림이 도착하는 예시 카드 한 장. 예시 카드는 "가입하면 이런 게 온다" 를 글보다 먼저 보여 주려는 그림이라
// 실제 게임 이름, 값을 쓰지 않는다(지어낸 값이 진짜처럼 읽히지 않게). 낭독기에는 숨긴다 — 같은 말을 목록이 이미 한다.
// 좁은 화면에서는 예시 카드와 빛줄기를 뺀다 — 폼 아래로 밀려 있어 꾸밈이 스크롤만 늘린다.
import { BellIcon } from "@/components/ui/icons";
import { AUTH_SHOWCASE_MESSAGES as M } from "@/lib/auth/messages";
import { stagger } from "@/lib/motion";

/** 바탕 빛 번짐. 판(면)이 아니라 바탕이라 글자 대비를 건드리지 않는다(payments/plan-nudge 와 같은 짝) */
export function AuthGlow() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(38% 55% at 18% 38%, color-mix(in oklab, var(--acc) 13%, transparent), transparent 72%), radial-gradient(30% 45% at 72% 78%, color-mix(in oklab, var(--plum) 9%, transparent), transparent 70%)",
      }}
    />
  );
}

/** 로고 머리에서 오른쪽으로 벌어지는 빛줄기. 로고(34px) 바로 오른쪽에서 시작해 제목 위를 지난다 */
export function AuthBeam() {
  return <span aria-hidden className="torch-cone -top-6 left-[38px] hidden h-24 w-[420px] [--torch-mouth:9px] lg:block" />;
}

/** 할인 알림이 도착하는 예시 카드. 타이핑 제목이 다 찍힐 즈음 올라온다(stagger 마지막 칸) */
export function AuthAlertPreview() {
  return (
    <div aria-hidden className="enter-item hidden w-[300px] items-center gap-3 rounded-[var(--radius-md)] bg-surface px-3.5 py-3 shadow-[var(--elev-card)] lg:flex" style={stagger(8)}>
      <span className="bell-ring grid size-9 shrink-0 place-items-center rounded-full bg-acc-soft text-acc">
        <BellIcon size={17} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12.5px] font-bold text-ink">{M.title}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-mut">
          <span className="rounded-[5px] bg-acc px-1.5 py-px text-[11px] font-bold text-on-ink">{M.pct}</span>
          {M.body}
        </span>
      </span>
    </div>
  );
}
