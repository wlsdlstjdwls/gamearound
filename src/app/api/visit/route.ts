// POST /api/visit — 사이트 화면 조회 한 번(server/visits). 브라우저 sendBeacon 이 부른다(components/visit-beacon).
//
// 운영 배포에서만 센다. 로컬 dev 와 미리 보기 배포가 세면 개발 중 새로고침이 운영 숫자에 섞인다 —
// 이 PC 의 .env.local 은 VERCEL_ENV=production 이라 NODE_ENV 도 같이 본다(dev 서버는 development).
// 서버 렌더가 아니라 브라우저가 부르게 한 이유는 게임 조회 기록(api/games/view)과 같다: 스크립트를 안 돌리는 봇이 섞이지 않는다.
import { z } from "zod";
import { siteSourceOf, VISIT_PATH_MAX, VISIT_REFERRER_MAX, VISITOR_ID_PATTERN } from "@/lib/stats/visits";
import { recordVisit } from "@/server/visits";

const bodySchema = z.object({
  vid: z.string().regex(VISITOR_ID_PATTERN),
  path: z.string().min(1).max(VISIT_PATH_MAX),
  landing: z.boolean(),
  ref: z.string().max(VISIT_REFERRER_MAX).nullable(),
});

const counting = () => process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";

export async function POST(req: Request) {
  if (!counting()) return new Response(null, { status: 204 });
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    // 본문이 JSON 이 아니면 아래 검증이 거른다
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return new Response(null, { status: 400 });
  const { vid, landing, ref } = parsed.data;
  const host = req.headers.get("host");
  await recordVisit({ visitorId: vid, landing, source: landing ? siteSourceOf(ref, host) : null });
  return new Response(null, { status: 204 });
}
