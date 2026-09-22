"use client";
// 온보딩의 "다음" 버튼 — 서버 액션이 도는 동안 눌린 상태를 유지하고, 답하기 전에는 꺼져 있다.
// useFormStatus 를 쓰려면 form 밖이 아니라 form **안의 클라이언트 컴포넌트**여야 한다(리액트 규칙).
// 껍데기(shell)는 서버 컴포넌트로 두고 이 한 조각만 클라이언트로 가른 이유가 그것이다(규약 §6).
import { useFormStatus } from "react-dom";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { Button } from "@/components/ui/button";
import { useAnswerGate } from "@/components/onboarding/answer-gate";

export function OnboardingSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { required, answered } = useAnswerGate();
  return (
    <Button type="submit" size="lg" fullWidth loading={pending} loadingLabel={M.saving} disabled={required && !answered}>
      {label}
    </Button>
  );
}
