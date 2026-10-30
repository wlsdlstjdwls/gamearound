// GET /api/version — 지금 돌고 있는 배포의 표식. 열려 있던 탭이 옛 번들인지 견주는 데 쓴다(components/app-shell/update-notice).
// 표식을 고르는 규칙은 next.config 의 NEXT_PUBLIC_BUILD_ID 와 같아야 한다 — 하나는 빌드 때, 하나는 실행 때 같은 변수를 읽는다.
// 빈 문자열도 "없음" 으로 본다(|| ) — vercel env pull 로 받은 .env.local 은 이 변수들을 빈 값으로 들고 있다.
// 캐시하지 않는다: 캐시된 답이면 새 배포가 나가도 옛 표식을 돌려줘 안내가 뜨지 않는다.
export const dynamic = "force-dynamic"; // 요청마다 지금 배포의 값을 읽는다(위 주석)

export function GET() {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";
  return Response.json({ id }, { headers: { "Cache-Control": "no-store" } });
}
