// 요금 카드 색 고르기(lib/pricing/copy-tones)의 클래스. 배지는 ui/tag 의 tone 을 그대로 쓰고, 여기는 띠와 글자만 둔다.
// 클래스 문자열을 통째로 적는다 — Tailwind 는 소스에 적힌 글자만 찾아 조립한 이름(`bg-${tone}-soft`)은 생기지 않는다.
// "use client" 가 아니다 — 서버 화면(요금 페이지)과 관리자 미리 보기가 같이 읽는다(AGENTS 6장 푸터 사고).
import type { BoxTone, TextTone } from "@/lib/pricing/copy-tones";

export const BOX_TONE_CLASS: Record<BoxTone, string> = {
  acc: "bg-acc-soft text-acc",
  plum: "bg-plum-soft text-plum",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-ink-2",
};

export const TEXT_TONE_CLASS: Record<TextTone, string> = {
  danger: "text-danger",
  acc: "text-acc",
  plum: "text-plum",
  mut: "text-mut",
};
