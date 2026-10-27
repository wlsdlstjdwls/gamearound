// POST /api/promo/track — 광고 카드가 보였다(seen), 눌렸다(clicked)는 신호를 세는 곳(2026-10-27, 기획서 4.4). components/promo/ad-track 이 sendBeacon 으로 부른다.
//
// 서버 렌더에서 세지 않는 이유는 schema-promotions 의 promotionImpressions 주석에 있다. 봇 대부분이 스크립트를 돌리지 않는 것도 덤이다.
// 응답 본문은 쓰지 않는다 — beacon 은 답을 읽지 못한다. 세기가 실패해도 204 다: 보낸 쪽이 할 수 있는 일이 없다.
import { z } from "zod";
import { AD_TRACK_MAX_IDS } from "@/lib/promo/boost";
import { recordAdEvents } from "@/server/services/promotions";

const ids = z.array(z.uuid()).max(AD_TRACK_MAX_IDS).default([]);
const bodySchema = z.object({ seen: ids, clicked: ids });

export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    // 본문이 JSON 이 아니면 아래 검증이 거른다
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return new Response(null, { status: 400 });
  await recordAdEvents(parsed.data).catch(() => {});
  return new Response(null, { status: 204 });
}
