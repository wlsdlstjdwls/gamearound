"use client";
// 광고 걸기 줄의 상태 딱지 — 관리자 유료 노출 목록과 산 사람의 광고 성과 화면이 같은 말, 같은 색을 쓴다.
// 노출 중은 파랑, 대기는 보라, 끝남은 회색(2026-10-30 사용자 "뱃지 초록색 쓰지 마" — 초록, 청록을 걷었다).
// 이름표는 공통코드 BOOST_STATE(코드북)라 클라이언트 부품이다 — 서버 화면(내 광고 성과)에서도 그대로 끼운다.
import { useCodes } from "@/components/code-book";
import { Tag, type TagTone } from "@/components/ui/tag";
import type { BoostState } from "@/lib/promo/boost";

const STATE_TONE: Record<BoostState, TagTone> = { active: "acc", queued: "plum", ended: "neutral", revoked: "warn" };

export function BoostStateTag({ state }: { state: BoostState }) {
  const { name } = useCodes();
  return <Tag tone={STATE_TONE[state]}>{name("BOOST_STATE", state)}</Tag>;
}
