"use server";
// 플레이테스트 모집 열기, 마감(2026-10-27). 글쓴이 확인은 서비스가 한다. 바뀌면 관리 화면, 게임 상세, 모아 보기를 민다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { createPlaytestSchema, updatePlaytestSchema, type CreatePlaytestInput, type UpdatePlaytestInput } from "@/lib/indie/playtest";
import { PLAYTEST_MESSAGES as M } from "@/lib/indie/playtest-messages";
import { indiePath, ROUTES } from "@/lib/routes";
import { closePlaytest, createPlaytest, updatePlaytest } from "@/server/services/indie";
import type { PlaytestActionResult } from "@/app/(public)/playtests/actions";

function refresh(slug: string) {
  revalidatePath(indiePath(slug));
  revalidatePath(ROUTES.playtests);
}

export async function createPlaytestAction(input: CreatePlaytestInput): Promise<PlaytestActionResult> {
  const parsed = createPlaytestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.failed };
  try {
    refresh((await createPlaytest(parsed.data)).slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function closePlaytestAction(playtestId: string): Promise<PlaytestActionResult> {
  if (!z.uuid().safeParse(playtestId).success) return { ok: false, error: M.notFound };
  try {
    refresh((await closePlaytest(playtestId)).slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function updatePlaytestAction(input: UpdatePlaytestInput): Promise<PlaytestActionResult> {
  const parsed = updatePlaytestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.failed };
  try {
    refresh((await updatePlaytest(parsed.data)).slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
