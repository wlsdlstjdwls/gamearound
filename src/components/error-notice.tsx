"use client";
// 에러 안내 본문 — app/error.tsx(화면 한 칸)와 app/global-error.tsx(루트 레이아웃이 죽었을 때)가 같이 쓴다.
// 화면에는 사람이 할 수 있는 일만 적는다. 원인은 console.error 로 남긴다(lib/messages 주석).
//
// "홈으로" 가 Link 가 아니라 a 인 이유: 에러가 난 뒤의 클라이언트 라우터 상태는 믿을 수 없다.
// 소프트 이동은 그 상태를 그대로 들고 가서 같은 자리에서 또 넘어질 수 있다 — 새로 불러오면 깨끗하다.
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page";
import { ERROR_MESSAGES } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export function ErrorNotice({ error, onRetry }: { error: Error & { digest?: string }; onRetry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-[var(--page-w)] flex-col items-start gap-2 px-7 py-20">
      <PageHead title={ERROR_MESSAGES.title} />
      <p className="max-w-[460px] text-[13.5px] leading-[1.75] text-mut">{ERROR_MESSAGES.body}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onRetry} className={buttonClass()}>
          {ERROR_MESSAGES.retry}
        </button>
        <a href={ROUTES.home} className={buttonClass({ variant: "secondary" })}>
          {ERROR_MESSAGES.home}
        </a>
      </div>
      {error.digest && (
        <p className="mt-4 text-[11.5px] leading-[1.6] text-dim-2">
          {ERROR_MESSAGES.codeLabel} {error.digest}
          <span className="sr-only">. {ERROR_MESSAGES.codeHelp}</span>
        </p>
      )}
    </div>
  );
}
