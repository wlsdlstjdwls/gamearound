// Vercel Blob 파일 지우기 — 매장 상품 사진과 할 일 첨부가 같이 쓴다(AGENTS §3, 두 곳이 되어 뽑았다).
//
// 표 행은 cascade 로 지워져도 저장소 파일은 남는다. 남은 파일은 아무도 안 보는데 저장비만 먹으므로,
// 행을 지우는 서비스가 주소를 먼저 모아 두었다가 행을 지운 뒤 이걸 부른다.
import "server-only";
import { del } from "@vercel/blob";

/**
 * 실패해도 던지지 않는다 — 행은 이미 지웠고, 파일 하나가 남는 것이 지우기 버튼이 오류를 내는 것보다 낫다.
 * 남은 파일은 `vercel blob list` 로 경로 접두(shops/, admin/tasks/)를 보고 치운다.
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await del(urls).catch((e) => console.error("[blob] 파일 지우기 실패", urls.length, e));
}
