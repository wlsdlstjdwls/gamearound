"use client";
// 설정 개인화 마디의 손잡이 둘 — 사이트 적용 토글, 초기화(2026-10-07, 사용자 요청).
//
// 토글은 값을 남기고 읽는 쪽만 멈춘다. 초기화는 값을 지우고 첫 질문으로 보낸다(동의는 남긴다).
// 철회(PersonalizationOff)와 셋이 나란히 서므로 각자 무엇을 지우는지를 문구가 말해야 한다(lib/onboarding/messages).
// 토글은 누르는 즉시 모양을 바꾸고(낙관적) 실패하면 되돌린다 — 스위치가 서버 왕복만큼 굳어 있으면 고장으로 읽힌다.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import { welcomeStepPath } from "@/lib/routes";
import { resetPersonalizationAction, setPersonalizationAppliedAction } from "@/app/(user)/settings/actions";

const M = ONBOARDING_MESSAGES.settings;

export function PersonalizationApplyToggle({ initialApplied }: { initialApplied: boolean }) {
  const [applied, setApplied] = useState(initialApplied);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-surface-2 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{M.applyTitle}</p>
          <p className="mt-0.5 text-[12.5px] text-mut">{applied ? M.applyOn : M.applyOff}</p>
        </div>
        <Switch
          on={applied}
          label={M.applyTitle}
          disabled={pending}
          onToggle={() => {
            const next = !applied;
            setApplied(next);
            setError(null);
            start(async () => {
              const res = await setPersonalizationAppliedAction(next);
              if (!res.ok) {
                setApplied(!next);
                setError(res.error);
              }
            });
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-[11.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function PersonalizationReset() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => {
          if (!confirm(M.resetConfirm)) return;
          start(async () => {
            const res = await resetPersonalizationAction();
            if (res.ok) router.push(welcomeStepPath("platforms"));
            else setError(res.error);
          });
        }}
      >
        {M.reset}
      </Button>
      {error && (
        <p role="alert" className="text-[11.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
