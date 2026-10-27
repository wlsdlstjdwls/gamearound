// 유료 노출 걸기, 회수 요청의 모양(/admin/promotions). 서버 액션이 검사한다.
import { z } from "zod";
import { BOOST_DAY_OPTIONS, PROMO_SLOTS } from "./boost";

/** 메모 상한 — 한 줄 메모다. 관리자 목록 한 줄에 서는 길이 */
export const BOOST_NOTE_MAX = 200;

export const grantBoostSchema = z.object({
  slot: z.enum(PROMO_SLOTS),
  targetId: z.uuid(),
  days: z.coerce.number().refine((n) => (BOOST_DAY_OPTIONS as readonly number[]).includes(n)),
  note: z.string().trim().max(BOOST_NOTE_MAX).default(""),
});

export type GrantBoostInput = z.infer<typeof grantBoostSchema>;
