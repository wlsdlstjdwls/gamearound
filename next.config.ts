import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.akamai.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  // 크롤러 스크립트(tsx)와 서버 코드가 같은 저장소를 공유하므로 서버 외부 패키지 지정
  serverExternalPackages: ["web-push", "cheerio"],
  // 새 버전 안내(app-shell/update-notice)가 견줄 이 번들의 배포 표식. 서버 쪽은 /api/version 이 같은 변수를 실행 때 읽는다(lib/pwa)
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local" },
};

export default nextConfig;
