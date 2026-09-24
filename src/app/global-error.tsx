"use client";
// 루트 레이아웃이 죽었을 때의 화면(2026-09-24 신설).
//
// 없을 때는 Next 내장 화면("This page couldn't load")이 떴다 — 영어이고, 우리 테마도 폰트도 없다.
// 머리글의 로그아웃 요청 하나가 실패한 것만으로 사용자가 그 화면을 봤다(use-sign-out 주석).
//
// 이 파일은 루트 레이아웃을 **대신한다**. 그래서 html, body, 전역 CSS, 테마 스크립트를 여기서 다시 싣는다 —
// 안 실으면 토큰이 비어 흰 바탕에 맨 글자가 된다. 머리글, 세션은 싣지 않는다(죽은 게 바로 그쪽일 수 있다).
//
// "다시 시도" 가 retry() 가 아니라 새로고침인 이유: 루트가 넘어진 뒤라 되살릴 트리가 없다.
// 같은 상태로 다시 그리면 같은 자리에서 또 넘어진다.
import "./globals.css";
import { ErrorNotice } from "@/components/error-notice";
import { ERROR_MESSAGES } from "@/lib/messages";
import { SITE } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export default function RootError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang={SITE.locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <title>{ERROR_MESSAGES.title}</title>
        <main className="flex flex-1 flex-col">
          <ErrorNotice error={error} onRetry={() => window.location.reload()} />
        </main>
      </body>
    </html>
  );
}
