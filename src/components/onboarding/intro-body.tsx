// 0단계 본문 — 무엇을 왜 묻는지와 개인화 동의.
//
// 동의를 가입 약관에 끼워 넣지 않고 여기서 따로 받는 이유는 설계 §5 다. 가입에 묶으면
// "가입하려면 취향을 내놔야 한다" 가 되고, 그건 선택 동의가 아니다.
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icons";

export function IntroBody({ error }: { error?: string }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[14px] leading-[1.75] text-ink-2">{M.intro.body}</p>
      <ul className="flex flex-col gap-2.5">
        {M.intro.points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13.5px] leading-[1.6] text-mut">
            <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-acc-soft text-acc">
              <CheckIcon size={11} />
            </span>
            {p}
          </li>
        ))}
      </ul>
      {/* 동의는 기본 해제다. 미리 켜 두면 사람이 고른 적 없는 값이 동의로 기록된다 */}
      <Checkbox name="consent" error={error}>
        {M.intro.consent}
      </Checkbox>
    </div>
  );
}
