"use client";
// 에러 안내 본문 — app/error.tsx(화면 한 칸)와 app/global-error.tsx(루트 레이아웃이 죽었을 때)가 같이 쓴다.
// 화면에는 사람이 할 수 있는 일만 적는다. 원인은 console.error 로 남긴다(lib/messages 주석).
//
// "홈으로" 가 Link 가 아니라 a 인 이유: 에러가 난 뒤의 클라이언트 라우터 상태는 믿을 수 없다.
// 소프트 이동은 그 상태를 그대로 들고 가서 같은 자리에서 또 넘어질 수 있다 — 새로 불러오면 깨끗하다.
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/button";
import { StatusPanel } from "@/components/ui/status-panel";
import { ERROR_MESSAGES } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export function ErrorNotice({ error, onRetry }: { error: Error & { digest?: string }; onRetry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    // 모양은 DB 장애 안내와 같은 판이다(components/ui/status-panel 주석) — 어떤 사고든 한 얼굴로 보인다
    <div className="w-full px-5 sm:px-7">
      <StatusPanel
        size="page"
        role="alert"
        title={ERROR_MESSAGES.title}
        body={ERROR_MESSAGES.body}
        actions={
          <>
            <button type="button" onClick={onRetry} className={buttonClass()}>
              {ERROR_MESSAGES.retry}
            </button>
            <a href={ROUTES.home} className={buttonClass({ variant: "secondary" })}>
              {ERROR_MESSAGES.home}
            </a>
          </>
        }
        footnote={
          error.digest && (
            <>
              {ERROR_MESSAGES.codeLabel} {error.digest}
              <span className="sr-only">. {ERROR_MESSAGES.codeHelp}</span>
            </>
          )
        }
      />
    </div>
  );
}
