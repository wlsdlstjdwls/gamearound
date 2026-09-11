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
};

export default nextConfig;
