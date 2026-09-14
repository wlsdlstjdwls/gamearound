"use client";
// 전역 에러 바운더리 — 서버 오류 시 흰 화면 대신 안내.
// 화면에는 사람이 할 수 있는 일만 적는다. 원인은 console.error 로 서버 로그가 받는다(lib/messages 주석).
import { useEffect } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ERROR_MESSAGES } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-[var(--page-w)] flex-col items-start gap-2 px-7 py-20">
      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">{ERROR_MESSAGES.title}</h1>
      <p className="max-w-[460px] text-[13.5px] leading-[1.75] text-mut">{ERROR_MESSAGES.body}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={reset} className={buttonClass()}>
          {ERROR_MESSAGES.retry}
        </button>
        <Link href={ROUTES.home} className={buttonClass({ variant: "secondary" })}>
          {ERROR_MESSAGES.home}
        </Link>
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
