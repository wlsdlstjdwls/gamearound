"use server";
// 프로그램별사용자권한관리 저장 Server Action. 몸통은 services/admin-grants-save(사용자별프로그램관리와 같은 규칙), 여기는 이 화면의 저장 권한만 정한다.
import { ROUTES } from "@/lib/routes";
import { saveGrantsFrom, type GrantsActionResult } from "@/server/services/admin-grants-save";

export async function saveGrantsAction(input: unknown): Promise<GrantsActionResult> {
  return saveGrantsFrom(ROUTES.adminGrants, input);
}
