"use client";
// 전역 에러 바운더리 — 서버 오류 시 흰 화면 대신 안내
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-[var(--page-w)] flex-col items-start gap-2 px-7 py-20">
      <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">문제가 발생했습니다</h1>
      <p className="text-[13.5px] leading-[1.75] text-mut">데이터베이스 연결 또는 외부 서비스 설정을 확인하세요.</p>
      {error.digest && <p className="text-[11.5px] text-dim-2">digest: {error.digest}</p>}
      <button type="button" onClick={reset} className="press mt-4 inline-flex h-9 items-center rounded-[9px] bg-ink px-3.5 text-[13px] font-semibold text-on-ink">
        다시 시도
      </button>
    </div>
  );
}
