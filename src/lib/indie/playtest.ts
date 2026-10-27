// 플레이테스트 모집의 수치, 입력 모양, 순수 판정(2026-10-27, 기획서 3장 5번). 화면, 서버 액션, 서비스가 같은 값을 본다.
// "use client" 파일이 아니다 — 서버 화면과 클라이언트 폼이 같이 읽는다(AGENTS 6장).
import { z } from "zod";
import { PLAYTEST_MESSAGES as M } from "./playtest-messages";

/** 모집 이름 상한 — 카드 한 줄("알파 테스트 1차 모집") 길이 */
export const PLAYTEST_TITLE_MAX = 40;
/** 안내 상한 — 무엇을 해 보는지, 어떻게 받는지, 보상까지 적을 만큼. 인디 글 본문보다 짧다(그쪽이 게임 소개다) */
export const PLAYTEST_BODY_MAX = 1000;
/** 인원 상한. 인디 플레이테스트는 수십 명이 보통이고, 이보다 크면 "모집" 이 아니라 공개 체험판이다 */
export const PLAYTEST_SLOTS_MAX = 500;
/** 신청 한마디 상한 — 연락처와 기기 정도 */
export const PLAYTEST_MESSAGE_MAX = 300;
/** 모집 기간(일). 한 주 단위로 골라 마감 날을 외우기 쉽게 */
export const PLAYTEST_DAY_OPTIONS = [7, 14, 30] as const;
/** 모아 보기 화면 맨 위에 세우는 메이커 멤버십 모집 수(기획서 4.3 "플레이테스트 모집 상단 고정"). 유료 자리 수를 묶는 이유는 lib/promo/boost 머리 주석 */
export const PLAYTEST_PIN_CAPACITY = 3;

export const createPlaytestSchema = z.object({
  postId: z.uuid(),
  title: z.string().trim().min(1, M.titleRequired).max(PLAYTEST_TITLE_MAX),
  body: z.string().trim().min(1, M.bodyRequired).max(PLAYTEST_BODY_MAX),
  slots: z.coerce.number().int().min(1, M.slotsRange).max(PLAYTEST_SLOTS_MAX, M.slotsRange),
  days: z.coerce.number().refine((n) => (PLAYTEST_DAY_OPTIONS as readonly number[]).includes(n)),
});
export type CreatePlaytestInput = z.infer<typeof createPlaytestSchema>;

export const applyPlaytestSchema = z.object({
  playtestId: z.uuid(),
  message: z.string().trim().min(1, M.messageRequired).max(PLAYTEST_MESSAGE_MAX),
});
export type ApplyPlaytestInput = z.infer<typeof applyPlaytestSchema>;

/** 지금 신청을 받나. 마감 시각을 넘겼거나 일찍 닫았으면 아니다. 인원이 찼는지는 따로 본다(찼어도 "모집 중, 마감 임박" 이 아니라 "다 찼어요" 로 말해야 해서) */
export function isPlaytestOpen(p: { closesAt: Date; closedAt: Date | null }, now: Date): boolean {
  return p.closedAt === null && p.closesAt > now;
}

export type PlaytestPhase = "open" | "full" | "closed";

export function playtestPhase(p: { closesAt: Date; closedAt: Date | null; slots: number; applicants: number }, now: Date): PlaytestPhase {
  if (!isPlaytestOpen(p, now)) return "closed";
  return p.applicants >= p.slots ? "full" : "open";
}
