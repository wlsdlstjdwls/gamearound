"use client";
// 화면 에러 바운더리 — 서버 오류 시 흰 화면 대신 안내. 본문은 ErrorNotice 가 global-error 와 같이 쓴다.
// 루트 레이아웃(머리글, 세션) 자체가 던진 예외는 여기로 오지 않는다 — 그건 app/global-error.tsx 몫이다.
import { ErrorNotice } from "@/components/error-notice";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorNotice error={error} onRetry={reset} />;
}
