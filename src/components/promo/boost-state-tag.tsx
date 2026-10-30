// 광고 걸기 줄의 상태 딱지 — 관리자 유료 노출 목록과 산 사람의 광고 성과 화면이 같은 말, 같은 색을 쓴다.
// 노출 중은 파랑, 대기는 보라, 끝남은 회색(2026-10-30 사용자 "뱃지 초록색 쓰지 마" — 초록, 청록을 걷었다).
import { Tag, type TagTone } from "@/components/ui/tag";
import type { BoostState } from "@/lib/promo/boost";
import { BOOST_STATE_LABEL } from "@/lib/promo/messages";

const STATE_TONE: Record<BoostState, TagTone> = { active: "acc", queued: "plum", ended: "neutral", revoked: "warn" };

export function BoostStateTag({ state }: { state: BoostState }) {
  return <Tag tone={STATE_TONE[state]}>{BOOST_STATE_LABEL[state]}</Tag>;
}
