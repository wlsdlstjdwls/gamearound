import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: "손전등", template: "%s | 손전등" },
  description: "게임 가격·플레이타임·평점·뉴스를 한 곳에서. 플랫폼별 할인 알림.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "손전등" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 루트 레이아웃은 cookies()를 읽지 않는다(홈 풀 라우트 캐시 유지). 세션 표시는 SessionProvider가 클라이언트에서 /api/auth/me 로 가져온다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <SessionProvider>
          <SiteHeader />
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
          <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            손전등 · 가격/정보는 각 스토어 및 외부 소스에서 주기적으로 수집되며 실시간이 아닙니다.
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
