// 비밀번호 재설정 — 링크 발급, 확인, 새 비밀번호 저장.
//
// 계정이 있는지 밖에서 알 수 없게 한다: 요청은 계정이 없어도 같은 답을 하고, 메일 발송은 응답 뒤(after)로 미뤄
// 응답 시간으로도 갈리지 않게 한다(액션 쪽). 이 파일은 계정이 없으면 조용히 아무것도 안 한다.
//
// 재설정이 끝나면 그 사람의 세션을 전부 지운다 — 비밀번호를 바꾸는 이유가 "누가 내 계정에 들어왔다" 일 수 있다.
// 새 세션을 바로 발급하지 않고 로그인 화면으로 보낸다: 인증 레이아웃과 액션의 목적지가 경주하는 자리를
// 하나 더 만들지 않으려는 것이다(auth-redirect-race 와 같은 꼴).
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { RESET_TOKEN_BYTES, RESET_TOKEN_TTL_MIN } from "@/lib/auth/constants";
import { ROUTES } from "@/lib/routes";
import { hashPassword } from "@/server/auth/password";
import { createdBy, updatedBy } from "@/server/db/audit";
import { getDb } from "@/server/db/client";
import { passwordResetTokens, sessions, users } from "@/server/db/schema";
import { APP_URL_ENV } from "@/server/mail/constants";
import { passwordResetMail } from "@/server/mail/password-reset-mail";
import { mailConfigured, sendMail } from "@/server/mail/send";
import { findUserByEmail } from "@/server/services/users";

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 메일 링크의 기준 주소. 없으면 재설정은 꺼진 것으로 본다(이유는 mail/constants 의 APP_URL_ENV 주석) */
function appOrigin(): string | null {
  const raw = process.env[APP_URL_ENV]?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** 메일을 보낼 수단과 링크 주소가 다 있는가. 없으면 폼이 "지금은 보낼 수 없어요" 로 답한다 */
export function passwordResetAvailable(): boolean {
  return mailConfigured() && appOrigin() !== null;
}

/**
 * 링크를 만들어 메일로 보낸다. 계정이 없거나 비밀번호 없는 계정이면 아무것도 안 한다.
 * 앞서 받은 안 쓴 링크는 닫는다 — 메일함에 링크가 여러 개 살아 있으면 어느 것이 유효한지 사람이 모른다.
 */
export async function sendPasswordResetLink(email: string, ip: string | null): Promise<void> {
  const origin = appOrigin();
  if (!origin) return;
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) return;

  const token = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  const db = getDb();
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date(), ...updatedBy("system") })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({
    id: hashResetToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000),
    ip: ip?.slice(0, 64) ?? null,
    ...createdBy("user", user.id),
  });

  const link = `${origin}${ROUTES.resetPassword}?token=${encodeURIComponent(token)}`;
  await sendMail(passwordResetMail(user.email, link));
}

/** 아직 쓸 수 있는 링크인가(화면이 폼을 보여 줄지 정한다). 소비하지 않는다 */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  const row = await getDb().query.passwordResetTokens.findFirst({
    columns: { id: true },
    where: and(eq(passwordResetTokens.id, hashResetToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())),
  });
  return Boolean(row);
}

/**
 * 링크를 쓰고 비밀번호를 바꾼다. 쓸 수 없는 링크면 false.
 * 링크 닫기를 조건부 UPDATE 하나로 한다 — 같은 링크로 두 요청이 겹쳐도 하나만 행을 얻는다.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const db = getDb();
  const [claimed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date(), ...updatedBy("user") })
    .where(and(eq(passwordResetTokens.id, hashResetToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .returning({ userId: passwordResetTokens.userId });
  if (!claimed) return false;

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, ...updatedBy("user", claimed.userId) }).where(eq(users.id, claimed.userId));
  await db.delete(sessions).where(eq(sessions.userId, claimed.userId));
  return true;
}
