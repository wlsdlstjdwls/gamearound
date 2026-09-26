// POST /api/shops/photos/upload — 판매 줄 사진의 Blob 업로드 토큰을 내준다(Vercel Blob 클라이언트 업로드).
//
// 파일은 여기로 안 온다. 브라우저가 이 경로에서 토큰을 받아 Blob 으로 곧장 올린다 — 함수 본문 한도(4.5MB)와
// 전송비를 피하는 길이다. 이 경로의 일은 **토큰을 줄 사람인가**를 가리는 것 하나다:
// 로그인, 매장 직원(관리자는 통과), 판매 줄이 그 매장 것, 경로 접두, 장수 상한.
//
// 업로드 완료 콜백(onUploadCompleted)은 쓰지 않는다. Blob 이 우리 주소를 되부르는 방식이라 로컬(localhost)에서는
// 안 닿는다. 대신 브라우저가 올린 뒤 registerPhotoAction 으로 등록하고, 그 액션이 파일을 head 로 확인한다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { LISTING_PHOTO_MAX, PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES } from "@/lib/shops/constants";
import { PHOTO_MESSAGES } from "@/lib/shops/listing-messages";
import { isOwnPhotoPath, photoUploadPayloadSchema } from "@/lib/shops/photo";
import { countListingPhotos, isListingInShop } from "@/server/services/listings";
import { findShopBySlug, findShopStaffRole } from "@/server/services/shops";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

/** 권한이 없으면 던진다. 레이아웃 가드(requireShopRole)는 리다이렉트를 던지는데 여기는 JSON 을 돌려줘야 한다 */
async function authorize(pathname: string, clientPayload: string | null): Promise<void> {
  const parsed = photoUploadPayloadSchema.safeParse(JSON.parse(clientPayload ?? "null"));
  if (!parsed.success) throw new Error(PHOTO_MESSAGES.forbidden);
  const user = await getCurrentUser();
  if (!user) throw new Error(PHOTO_MESSAGES.forbidden);
  const shop = await findShopBySlug(parsed.data.shopSlug);
  if (!shop) throw new Error(PHOTO_MESSAGES.forbidden);
  if (user.role !== "admin" && !(await findShopStaffRole(shop.id, user.id))) throw new Error(PHOTO_MESSAGES.forbidden);

  const { listingId } = parsed.data;
  if (!isOwnPhotoPath(pathname, shop.id, listingId)) throw new Error(PHOTO_MESSAGES.forbidden);
  if (!(await isListingInShop(listingId, shop.id))) throw new Error(PHOTO_MESSAGES.forbidden);
  if ((await countListingPhotos(listingId)) >= LISTING_PHOTO_MAX) throw new Error(PHOTO_MESSAGES.full(LISTING_PHOTO_MAX));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await authorize(pathname, clientPayload);
        return {
          allowedContentTypes: [...PHOTO_CONTENT_TYPES],
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          // 같은 이름을 두 번 올려도 덮지 않는다 — 경로 끝에 무작위 꼬리가 붙는다
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
