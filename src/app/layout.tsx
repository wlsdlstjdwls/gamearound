import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { SessionProvider } from "@/components/auth/session-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: { default: SITE.name, template: SITE.titleTemplate },
  description: SITE.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 루트 레이아웃은 cookies()를 읽지 않는다(홈 풀 라우트 캐시 유지). 세션 표시는 SessionProvider가 클라이언트에서 /api/auth/me 로 가져온다.
// 폭·패딩은 화면마다 다르므로 여기서 잡지 않는다 — 각 페이지가 <Page>로 지정한다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE.locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <SessionProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line bg-surface py-6 text-center text-[11.5px] text-dim">
            {SITE.name} · {SITE.dataDisclaimer}
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
