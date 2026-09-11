import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import "./globals.css";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={koKR}>
      <html lang="ko" className="h-full antialiased">
        <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
          <SiteHeader />
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
          <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            손전등 · 가격/정보는 각 스토어 및 외부 소스에서 주기적으로 수집되며 실시간이 아닙니다.
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
