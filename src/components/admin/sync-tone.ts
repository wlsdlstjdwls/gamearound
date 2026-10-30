// 수집 실행 결과의 색 규칙 한곳(2026-10-08). 수집현황과 수집이력조회가
// 같은 색으로 말해야 "저 화면의 주황이 이 화면의 주황" 으로 읽힌다 — 두 곳에서 쓰여 여기로 뺐다(AGENTS §3).
//
// 2026-10-29 두 화면을 공통 그리드로 옮기며 배지를 ui/tag 의 옅은 면으로 바꿨다. 정상은 면을 옅게 둔다 —
// 백 줄 중 아흔이 정상이라 정상까지 진하면 어느 것도 눈에 안 띈다. 누런색은 쓰지 않는다(10-27, 일부 실패는 주황).
// 정상은 회색(neutral)이다 — 2026-10-30 사용자 "뱃지 초록색 쓰지 마". 관리자 배지에서 초록(ok), 청록(info)을 걷고 파랑, 보라, 회색으로 말한다.
// 서버 컴포넌트도 읽을 수 있게 "use client" 를 붙이지 않는다(AGENTS §6 푸터 사고).
import type { TagTone } from "@/components/ui/tag";
import type { SyncHealth } from "@/lib/admin/sync-health";
import type { SyncLogRow } from "@/server/services/admin";

type SyncStatus = SyncLogRow["status"];

/** 실행 결과 배지 색(수집이력조회의 결과 칸, 수집현황의 끝난 실행) */
export const SYNC_STATUS_TONE: Record<SyncStatus, TagTone> = {
  ok: "neutral",
  partial: "warn",
  failed: "danger",
};

/** 스토어 상태 배지 색(수집현황). 끊김은 실패와 같은 무게다 — 둘 다 사람이 손봐야 한다 */
export const SYNC_HEALTH_TONE: Record<SyncHealth, TagTone> = {
  ...SYNC_STATUS_TONE,
  stalled: "danger",
  running: "acc",
  idle: "outline",
};
