import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SessionProvider } from "@/components/auth/session-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
  // 브라우저 UI(안드로이드 주소창, iOS 상태바)도 테마를 따라간다. 한 색만 주면
  // 다크에서 밝은 띠가 화면 위에 남는다. 값은 globals.css 의 --bg 와 같아야 한다
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SITE.backgroundColor },
    { media: "(prefers-color-scheme: dark)", color: SITE.backgroundColorDark },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 루트 레이아웃은 cookies()를 읽지 않는다(홈 풀 라우트 캐시 유지). 세션 표시는 SessionProvider가 클라이언트에서 /api/auth/me 로 가져온다.
// 폭, 패딩은 화면마다 다르므로 여기서 잡지 않는다 — 각 페이지가 <Page>로 지정한다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: 테마 스크립트가 하이드레이션 전에 html 에 data-theme 을 찍는다.
    // 서버가 보낸 HTML 에는 그 속성이 없으므로 React 가 "안 맞는다" 고 경고한다 — 여기서는 의도한 차이다.
    // 이 속성은 이 태그의 속성 비교만 끈다(자식 트리는 그대로 검사한다).
    <html lang={SITE.locale} className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        {/* 본문보다 먼저 실행돼야 흰 섬광이 없다 — 근거는 lib/theme 의 THEME_INIT_SCRIPT 주석 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <SessionProvider>
          <SiteHeader />
          {/*
            flex flex-col 을 더한 이유(2026-09-22): flex-1 은 flex-grow 만 주고 CSS height 는 auto 로 남긴다.
            그래서 안쪽에서 h-full 을 걸어도 백분율이 풀릴 기준이 없어 0 이 된다 — 로그인처럼 화면 높이만큼
            늘어나 세로 가운데에 서야 하는 화면이 위에 붙어 버렸다. 여기를 flex 기둥으로 만들면 자식이
            flex-1 한 줄로 남는 높이를 가져갈 수 있다(백분율을 안 쓴다).
            자식은 화면마다 하나뿐이라 배치는 그대로고, 바뀌는 것은 margin 상쇄가 꺼지는 것뿐이다 —
            모든 화면이 Page 의 padding 으로 위 여백을 잡고 있어 상쇄에 기대는 자리가 없다.
          */}
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </SessionProvider>
      </body>
    </html>
  );
}
