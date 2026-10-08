// 수집 실행 결과의 색 규칙 한곳(2026-10-08). 수집 현황 카드(배지, 왼쪽 띠)와 실행 로그 표(배지)가
// 같은 색으로 말해야 "저 화면의 노랑이 이 화면의 노랑" 으로 읽힌다 — 두 곳에서 쓰여 여기로 뺐다(AGENTS §3).
//
// 실행 로그는 결과를 색 글자만으로 적었는데, 표 한 줄에 같은 크기의 글자가 아홉 칸이라 "일부 실패" 가
// 숫자 사이에 묻혔다. 면을 깔아 배지로 세운다. 정상은 면을 옅게 둔다 — 백 줄 중 아흔이 정상이라
// 정상까지 진하면 어느 것도 눈에 안 띈다.
import type { SyncLogRow } from "@/server/services/admin";

type SyncStatus = SyncLogRow["status"];

/** 결과 배지(면 + 글자) */
export const SYNC_STATUS_BADGE: Record<SyncStatus, string> = {
  ok: "bg-ok-soft text-ok",
  partial: "bg-warn-soft text-warn",
  failed: "bg-danger-soft text-danger",
};

/** 카드 왼쪽 띠. 정상은 긋지 않는다 — 띠가 있는 카드만 봐도 손볼 곳이 다 보이게 */
export const SYNC_STATUS_STRIPE: Record<SyncStatus, string> = {
  ok: "",
  partial: "bg-warn",
  failed: "bg-danger",
};

/** 배지 모양. 수집 현황 카드와 실행 로그 줄이 같은 크기로 선다 */
export const SYNC_BADGE_SHAPE = "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold";
