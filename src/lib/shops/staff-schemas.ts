// 직원 초대 검증 규칙 — 서버 액션과 폼이 같은 스키마 하나를 본다(AGENTS §2).
import { z } from "zod";
import { STAFF_MESSAGES } from "./staff-messages";

/**
 * 초대로 줄 수 있는 역할. owner 는 없다 — 대표는 입점 승인이 정하는 자리이고
 * 초대 링크 하나로 넘어가면 매장을 통째로 넘기는 길이 된다.
 */
export const INVITABLE_ROLES = ["staff", "manager"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/** 사용자 표가 이메일을 소문자로 저장한다(schema.ts users 주석). 비교도 같은 꼴로 한다 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export const staffInviteSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email(STAFF_MESSAGES.emailInvalid)),
  role: z.enum(INVITABLE_ROLES, STAFF_MESSAGES.roleInvalid),
});

export type StaffInviteInput = z.infer<typeof staffInviteSchema>;

export const staffRemoveSchema = z.object({ userId: z.uuid(STAFF_MESSAGES.badRequest) });
export const inviteRevokeSchema = z.object({ inviteId: z.uuid(STAFF_MESSAGES.badRequest) });

/** 초대 수락 판정. 순수 함수로 둔 이유: 네 갈래가 전부 시험으로 고정돼야 하는 규칙이다 */
export type InviteVerdict = "ok" | "used" | "expired" | "mismatch";

export function judgeInvite(
  invite: { email: string; expiresAt: Date; acceptedAt: Date | null },
  userEmail: string,
  now: Date,
): InviteVerdict {
  if (invite.acceptedAt) return "used";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  // 링크가 다른 사람 손에 넘어가도 그 사람 계정으로는 못 들어온다 — 링크만 쥐면 들어오는 문을 만들지 않는다
  if (normalizeEmail(invite.email) !== normalizeEmail(userEmail)) return "mismatch";
  return "ok";
}
