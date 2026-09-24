"use client";
// 개인화 끄기 버튼. 확인창을 거치는 이유: 끄기는 받은 값 삭제와 한 몸이라 되돌릴 수 없다(설계 §5).
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { revokePersonalizationAction, type RevokeState } from "@/app/(user)/settings/actions";

export function PersonalizationOff() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<RevokeState | null>(null);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => {
          if (!confirm(M.settings.offConfirm)) return;
          start(async () => setState(await revokePersonalizationAction()));
        }}
        className="hover:border-danger hover:text-danger"
      >
        {M.settings.off}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-[11.5px] text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
