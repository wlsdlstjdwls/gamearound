// 판매 줄 사진의 규칙 — 저장 경로, 크기 맞추기, 업로드 요청 꼴. 순수 함수라 테스트로 고정한다.
//
// 경로에 매장과 판매 줄을 박는 이유: 업로드는 브라우저가 Blob 으로 곧장 보내고 우리 서버는 파일을 못 본다.
// 서버가 확인할 수 있는 것은 **토큰을 내줄 때 받은 경로**와 **등록할 때 받은 경로**뿐이다. 둘 다 이 접두로
// 시작해야 한다고 정해 두면, 남의 매장 경로로 토큰을 받거나 남의 사진을 내 물건에 등록하는 길이 막힌다.
import { z } from "zod";
import { isDirectChildPath } from "@/lib/blob-path";

export function photoPathPrefix(shopId: string, listingId: string): string {
  return `shops/${shopId}/listings/${listingId}/`;
}

/** 경로가 이 매장, 이 판매 줄 아래인가. `..` 로 접두를 빠져나가는 꼴도 막는다 */
export function isOwnPhotoPath(pathname: string, shopId: string, listingId: string): boolean {
  return isDirectChildPath(pathname, photoPathPrefix(shopId, listingId));
}

/** 긴 변이 maxEdge 를 넘으면 비율을 지켜 줄인다. 작은 사진은 키우지 않는다 */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const k = maxEdge / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

/** 업로드 토큰을 받을 때 브라우저가 싣는 값. 서버가 이것으로 권한을 다시 본다 */
export const photoUploadPayloadSchema = z.object({
  shopSlug: z.string().min(1).max(64),
  listingId: z.uuid(),
});

export type PhotoUploadPayload = z.infer<typeof photoUploadPayloadSchema>;

/** 올린 뒤 등록할 때 싣는 값. 크기는 브라우저가 줄인 결과다 — 화면이 자리를 미리 잡는 데만 쓴다 */
export const photoRegisterSchema = z.object({
  listingId: z.uuid(),
  url: z.url(),
  pathname: z.string().min(1).max(300),
  width: z.coerce.number().int().min(1).max(10_000),
  height: z.coerce.number().int().min(1).max(10_000),
});

export type PhotoRegisterInput = z.infer<typeof photoRegisterSchema>;
