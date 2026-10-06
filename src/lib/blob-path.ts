// Blob 경로 검사 — 매장 사진과 인디 홍보 그림이 같이 쓴다(AGENTS §3, 두 곳이 되어 뽑았다).
//
// 업로드는 브라우저가 Blob 으로 곧장 보내고 우리 서버는 파일을 못 본다. 서버가 확인할 수 있는 것은
// 토큰을 내줄 때 받은 경로와 등록할 때 받은 경로뿐이라, 둘 다 "주인의 접두 바로 아래 파일 하나" 여야 한다.

/** 경로가 접두 바로 아래 파일 하나인가. 하위 폴더와 `..` 로 접두를 빠져나가는 꼴을 막는다 */
export function isDirectChildPath(pathname: string, prefix: string): boolean {
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..");
}
