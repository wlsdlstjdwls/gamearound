// 발송 수단 값 읽기(2026-11-02). 고르기 칸은 글자를 돌려주므로 enum 으로 좁힌다 — 화면 두 곳(템플릿, 직접 발송)이 같이 쓴다.
import type { NotifyMedium } from "@/server/db/schema";

const MEDIA: readonly NotifyMedium[] = ["telegram", "email", "web"];

/** 모르는 값이면 텔레그램(기존 템플릿의 기본 수단) */
export function asMedium(v: string): NotifyMedium {
  return (MEDIA as readonly string[]).includes(v) ? (v as NotifyMedium) : "telegram";
}
