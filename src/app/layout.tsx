import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { SessionProvider } from "@/components/auth/session-provider";
import { SiteHeader } from "@/components/site-header";

// OG 이미지 URL 은 절대 경로여야 한다. 배포 주소를 모르면 Next 가 상대 경로로 내보내고 SNS 에서 미리보기가 깨진다.
const siteUrl = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : null,
  title: { default: SITE.name, template: SITE.titleTemplate },
  description: SITE.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
  openGraph: { type: "website", siteName: SITE.name, locale: "ko_KR" },
  // 트위터는 큰 카드를 쓰라고 명시해야 1200x630 을 그대로 보여준다
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 루트 레이아웃은 cookies()를 읽지 않는다(홈 풀 라우트 캐시 유지). 세션 표시는 SessionProvider가 클라이언트에서 /api/auth/me 로 가져온다.
// 폭, 패딩은 화면마다 다르므로 여기서 잡지 않는다 — 각 페이지가 <Page>로 지정한다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE.locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <SessionProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-line bg-surface py-6 text-center text-[11.5px] text-dim">
            {SITE.name} | {SITE.dataDisclaimer}
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
