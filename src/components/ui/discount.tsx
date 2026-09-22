/*
 * 할인율 글자 — "-20%" 의 부호만 따로 들어 올린다.
 *
 * 왜 필요한가(2026-09-22 실측, Chromium canvas TextMetrics):
 * 붙임표(U+002D)의 **잉크 중심이 숫자 잉크 중심보다 아래**에 있다.
 *
 *   48px / weight 800 기준, 베이스라인 위 단위
 *   ┌────────────────┬──────────┬──────────┬──────────────┐
 *   │ 폰트           │ 숫자 중심 │ 붙임표 중심 │ 차이          │
 *   ├────────────────┼──────────┼──────────┼──────────────┤
 *   │ Pretendard 800 │   17.5   │   13.5   │ -4.0 = 0.083em│
 *   │ Segoe UI 800   │   17.0   │   12.5   │ -4.5 = 0.094em│
 *   └────────────────┴──────────┴──────────┴──────────────┘
 *
 * 숫자는 베이스라인에서 cap 까지 꽉 차는 라이닝 피겨고, 붙임표는 소문자 사이(x-o-x)에 놓이도록
 * x-height 기준으로 그려진다. 둘의 광학 중심이 애초에 다르다 — 폰트 결함이 아니라 설계 의도라
 * 폰트를 갈아도 그대로 남는다. 12px 배지에서 약 1px 처지고, 그게 "미세하게 안 맞는" 정체다.
 *
 * 흔한 처방 둘은 실측으로 버렸다:
 * - 수학 빼기표(U+2212)로 교체: Pretendard 는 붙임표와 **완전히 같은 높이**(13.5)라 0 개선,
 *   Segoe UI 도 13.0 으로 0.01em 뿐이다. (Arial 이었으면 들었다 — 폰트마다 다르다.)
 * - tabular-nums 의심: 무죄다. Segoe UI 는 숫자가 이미 등폭(0 과 2 모두 28.76)이라 이 속성이
 *   붙임표 자리를 건드리지 않는다. 다만 Pretendard 800 은 숫자 폭이 제각각(0=32.74, 2=29.70)이라
 *   body 의 tabular-nums 가 "-11%" 와 "-80%" 의 폭을 맞춰 주는 값은 한다 — 떼면 안 된다.
 *
 * 올리는 값은 두 폰트의 가운데를 잡아 0.085em 으로 둔다(둘과의 오차는 12px 에서 0.1px 미만이라
 * 눈에 닿지 않는다). transform 은 자리를 차지하지 않으므로 배지 폭과 줄 위치는 그대로다.
 *
 * 글자를 막대(span)로 바꿔 그리지 않은 이유: "-20%" 는 복사되고 낭독되는 값이다.
 * 부호를 도형으로 만들면 둘 다 잃는다.
 *
 * OG 이미지(satori)는 이 컴포넌트를 쓰지 못한다 — 거기는 lib/format 의 formatDiscount 문자열 그대로다.
 */
import { formatDiscount } from "@/lib/format";

/** 붙임표를 숫자 광학 중심에 맞춰 올리는 폭. 근거는 파일 상단 표 */
const SIGN_LIFT = "-0.085em";

export function DiscountText({ pct }: { pct: number | null | undefined }) {
  const text = formatDiscount(pct);
  if (!text) return null;
  // formatDiscount 는 늘 "-" 로 시작한다. 그 한 글자만 떼어 올린다
  return (
    <>
      <span className="inline-block" style={{ transform: `translateY(${SIGN_LIFT})` }}>
        {text.slice(0, 1)}
      </span>
      {text.slice(1)}
    </>
  );
}
