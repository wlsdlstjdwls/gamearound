// 발송 수단 값 읽기(2026-11-02). 고르기 칸은 글자를 돌려주므로 enum 으로 좁힌다 — 화면 두 곳(템플릿, 직접 발송)이 같이 쓴다.
import type { NotifyMedium } from "@/server/db/schema";

const MEDIA: readonly NotifyMedium[] = ["telegram", "email", "web", "push"];

/** 모르는 값이면 텔레그램(기존 템플릿의 기본 수단) */
export function asMedium(v: string): NotifyMedium {
  return (MEDIA as readonly string[]).includes(v) ? (v as NotifyMedium) : "telegram";
}

/** 글만 쓰는 수단(꾸밈, 미디어 태그 없음). 알림함 한 줄과 기기 알림은 화면이 글자로 그린다 */
export function isPlainMedium(m: NotifyMedium): boolean {
  return m === "web" || m === "push";
}

/** 제목 칸이 있는 수단(메일 제목, 푸시 제목) */
export function hasSubject(m: NotifyMedium): boolean {
  return m === "email" || m === "push";
}
