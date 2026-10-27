// 유료 노출 자리의 수치와 순수 도우미(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4.2). 노출 화면, 관리자 화면, 검증이 같은 값을 본다.
//
// 자리 수를 묶는 이유(기획서 4.1): 한 화면에 유료 칸이 많으면 목록이 광고판이 되고 산 사람의 효과도 묽어진다.
// 산 글이 칸보다 많으면 시간 구간마다 차례를 돌린다 — 접속마다 무작위로 섞으면 같은 사람이 새로고침할 때마다 카드가 바뀌고,
// 서버 렌더와 다시 그리기가 어긋난다. 구간 안에서는 누구에게나 같은 순서다.
import type { PromoSlot, PromoTargetKind } from "@/server/db/schema";

export const PROMO_SLOTS = ["indie_top", "promo_pin"] as const satisfies readonly PromoSlot[];

/** 자리마다 한 화면에 세우는 수(기획서 4.2, 2026-10-27 사용자 확정: 인디 목록 맨 위 3, 홍보 고정 2) */
export const SLOT_CAPACITY: Record<PromoSlot, number> = { indie_top: 3, promo_pin: 2 };

/** 자리마다 받는 대상 */
export const SLOT_TARGET: Record<PromoSlot, PromoTargetKind> = { indie_top: "indie_post", promo_pin: "board_post" };

/** 관리자가 고르는 기간(일). 7일이 부스트 1회 상품 안(기획서 4.3)이고, 시범은 더 길게 걸 수 있게 둘을 더했다 */
export const BOOST_DAY_OPTIONS = [7, 14, 30] as const;

/** 차례를 바꾸는 구간. 한 시간이면 하루에 여러 번 앞자리가 돌고, 한 사람이 한 번 둘러보는 동안에는 순서가 그대로다 */
export const ROTATE_WINDOW_MS = 60 * 60 * 1000;

export type BoostState = "active" | "queued" | "ended" | "revoked";

/** 지금 이 줄의 상태. 시작 전이면 대기, 끝 시각은 포함하지 않는다 */
export function boostState(b: { startsAt: Date; endsAt: Date; revokedAt: Date | null }, now: Date): BoostState {
  if (b.revokedAt) return "revoked";
  if (now < b.startsAt) return "queued";
  if (now >= b.endsAt) return "ended";
  return "active";
}

/**
 * 걸린 것들 가운데 이번 구간에 세울 capacity 개. 들어온 순서를 원으로 보고 구간 번호만큼 시작점을 민다 —
 * 모두가 고르게 앞자리를 돈다. capacity 이하면 그대로 돌려준다.
 */
export function rotateForWindow<T>(items: readonly T[], capacity: number, now: Date, windowMs: number = ROTATE_WINDOW_MS): T[] {
  if (items.length <= capacity) return [...items];
  const offset = Math.floor(now.getTime() / windowMs) % items.length;
  return Array.from({ length: capacity }, (_, i) => items[(offset + i) % items.length]);
}

/** 기간의 끝 — 시작부터 days 일 */
export function boostEnd(startsAt: Date, days: number): Date {
  return new Date(startsAt.getTime() + days * 86_400_000);
}
