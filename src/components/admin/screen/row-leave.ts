"use client";
// 행 이동 확인(2026-10-30, 사용자 "행 이동 때마다 변경 여부 체크가 없다") — 편집 화면 공통.
// 고른 줄에 저장 안 한 값이 있으면 다른 줄로 가기 전에 묻는다: 저장(저장 뒤 이동), 저장 안 함(그 줄을 되돌리고 이동), 취소(머문다).
// 요금 화면(pricing-form)이 처음 붙였고, 공통코드, 알림 템플릿 화면이 같은 규칙을 써서 여기로 뺐다(AGENTS §3, 2곳이면 추출).
import { askChoice } from "@/components/ui/confirm-dialog";
import { SCREEN_MESSAGES as M } from "@/lib/admin/messages";

/**
 * 옮길지 정한다. true 면 옮긴다.
 * save 가 false 를 돌려주면(검사에 걸림) 머문다 — 틀린 값을 두고 떠나면 그 줄의 오류 표시를 다시 찾아야 한다.
 */
export async function confirmRowLeave({ dirty, save, revert }: { dirty: boolean; save: () => boolean; revert: () => void }): Promise<boolean> {
  if (!dirty) return true;
  const c = await askChoice(M.rowLeaveConfirm, { title: M.dirtyTitle, confirmLabel: M.rowLeaveSave, altLabel: M.rowLeaveDiscard });
  if (c === "cancel") return false;
  if (c === "alt") {
    revert();
    return true;
  }
  return save();
}
