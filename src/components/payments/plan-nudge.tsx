// 요금 안내(/indie/mine/plans)로 이끄는 판(2026-10-28). 사용자: "광고, 멤버십을 메뉴로 따로 두기보다 다른 화면에서 자연스럽게 이어지게".
// 메뉴 칸을 걷고, 만든 사람이 이미 지나가는 자리(등록현황, 내 게임 통계)에 이 판을 둔다.
// 처음엔 연한 파랑 띠였는데 "눈에 너무 안 띈다" 해서 어두운 판(ui/ink-hero)으로 올렸다가, 같은 날 "톤앤매너에 안 맞는다" 는 말을 들었다 —
// 사이트는 밝은 면 + 파랑이고 먹색 면은 이 판 하나뿐이라 떠 보였다. 지금은 홈 히어로와 같은 밝은 판(흰 면, 옅은 파랑 빛 번짐, 그림자)이다.
// 눈길은 색 대신 움직임으로 끈다: 손전등 심볼이 켜졌다 꺼지고, 켜질 때 판을 가로지르는 파랑 빛 줄기가 함께 선다(globals.css .torch).
// 값은 적지 않는다. 처음엔 가장 싼 단 값("스파크 6,900원부터")을 적었는데 10-28 사용자가 "문구도 금액도 별로" 라 했다 — 어디에 보이는지만 말한다.
// 낱말은 "광고" 대신 "알리기, 노출" 이다(같은 날 사용자: "광고란 표현보다 부드럽게"). 보는 사람 쪽 "광고" 표시는 법이 요구해서 그대로다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { BrandSymbol } from "@/components/ui/logo";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { ROUTES } from "@/lib/routes";

export function PlanNudge() {
  return (
    <section
      aria-label={M.nudgeTitle}
      className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-surface px-5 py-5 shadow-2 sm:px-6"
    >
      {/* 옅은 브랜드 빛 번짐(홈 히어로와 같은 짝). 면이 아니라 바탕이라 글자 대비를 건드리지 않는다 */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 90% at 92% 0%, color-mix(in oklab, var(--acc) 12%, transparent), transparent 70%), radial-gradient(40% 80% at 0% 100%, color-mix(in oklab, var(--acc) 8%, transparent), transparent 70%)",
        }}
      />
      {/* 손전등 머리(심볼 오른쪽 끝)에서 판 오른쪽 끝까지 벌어지는 빛 줄기. 심볼 자리(왼쪽 여백 24 + 심볼 48)에서, 심볼 키만큼의 폭으로 시작한다(globals.css .torch-cone).
          좁은 폭은 글과 단추가 두 줄로 접혀 심볼이 판 가운데 높이에 있지 않다 — 줄기가 엉뚱한 높이를 가로질러 빼고 심볼만 깜빡인다 */}
      <span aria-hidden className="torch-cone inset-y-0 left-[70px] hidden w-[80%] sm:block" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span aria-hidden className="torch shrink-0">
            <BrandSymbol size={40} className="sm:hidden" />
            <BrandSymbol size={48} className="hidden sm:block" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[17px] font-extrabold tracking-[-0.03em] text-ink sm:text-[19px]">{M.nudgeTitle}</p>
            <p className="text-[13.5px] text-mut">{M.nudgeLead}</p>
          </div>
        </div>
        {/* 단추는 하나다. 멤버십 단추를 옆에 두었더니 "왜 있는지 모르겠다"(2026-10-28 사용자) — 무엇을 주는지 말하지 않는 이름뿐이었다.
            멤버십은 요금 화면의 셋째 카드가 다른 둘과 나란히 견주며 설명한다 */}
        <Link href={ROUTES.makerPlans} className={buttonClass({ variant: "primary", size: "md", className: "shrink-0" })}>
          {M.nudgeCta}
        </Link>
      </div>
    </section>
  );
}
