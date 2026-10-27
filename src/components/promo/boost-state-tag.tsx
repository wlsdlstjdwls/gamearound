// 광고 걸기 줄의 상태 딱지 — 관리자 유료 노출 목록과 산 사람의 광고 성과 화면이 같은 말, 같은 색을 쓴다.
import { Tag, type TagTone } from "@/components/ui/tag";
import type { BoostState } from "@/lib/promo/boost";
import { BOOST_STATE_LABEL } from "@/lib/promo/messages";

const STATE_TONE: Record<BoostState, TagTone> = { active: "ok", queued: "info", ended: "acc", revoked: "warn" };

export function BoostStateTag({ state }: { state: BoostState }) {
  return <Tag tone={STATE_TONE[state]}>{BOOST_STATE_LABEL[state]}</Tag>;
}
