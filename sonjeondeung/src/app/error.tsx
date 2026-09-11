"use client";
// 전역 에러 바운더리 — 서버 오류 시 흰 화면 대신 안내
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">문제가 발생했습니다</h1>
      <p className="mt-2 text-slate-400">데이터베이스 연결 또는 외부 서비스 설정을 확인하세요.</p>
      {error.digest && <p className="mt-1 text-xs text-slate-600">digest: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
        다시 시도
      </button>
    </div>
  );
}
