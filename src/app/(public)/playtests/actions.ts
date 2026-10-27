"use server";
// 플레이테스트 신청, 취소(2026-10-27). 로그인 확인과 모집 상태는 서비스가 다시 본다. 바뀌면 게임 상세와 모아 보기(신청 수)를 민다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { applyPlaytestSchema, type ApplyPlaytestInput } from "@/lib/indie/playtest";
import { PLAYTEST_MESSAGES as M } from "@/lib/indie/playtest-messages";
import { indiePath, ROUTES } from "@/lib/routes";
import { applyPlaytest, withdrawPlaytest } from "@/server/services/indie";

export type PlaytestActionResult = { ok: true } | { ok: false; error: string };

function refresh(slug: string | null) {
  if (slug) revalidatePath(indiePath(slug));
  revalidatePath(ROUTES.playtests);
}

export async function applyPlaytestAction(input: ApplyPlaytestInput): Promise<PlaytestActionResult> {
  const parsed = applyPlaytestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.failed };
  try {
    refresh((await applyPlaytest(parsed.data)).slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function withdrawPlaytestAction(playtestId: string): Promise<PlaytestActionResult> {
  if (!z.uuid().safeParse(playtestId).success) return { ok: false, error: M.notFound };
  try {
    refresh((await withdrawPlaytest(playtestId)).slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
