// 인증(Clerk) 임시 우회 플래그.
// NEXT_PUBLIC_AUTH_DISABLED=1 이면 Clerk 런타임(Provider/middleware/auth())을 전혀 호출하지 않는다.
// 서버·클라이언트·미들웨어 모두 같은 변수를 읽도록 NEXT_PUBLIC_ 접두사 하나만 사용.
// 원복: 환경변수 삭제 후 재배포.
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "1";
