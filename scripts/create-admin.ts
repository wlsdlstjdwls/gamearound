// 관리자 계정 부트스트랩 (일회성). 가입 폼의 비밀번호 정책을 우회해 DB에 직접 생성/갱신한다.
//   tsx scripts/create-admin.ts --email=<EMAIL> --password=<PW> [--name=<DISPLAY_NAME>]
// 이미 있는 이메일이면 비밀번호, 역할을 갱신한다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { normalizeEmail } from "@/lib/auth/schemas";
import { hashPassword } from "@/server/auth/password";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const rawEmail = arg("email");
  const password = arg("password");
  const displayName = arg("name") ?? "관리자";
  if (!rawEmail || !password) {
    console.error("사용: tsx scripts/create-admin.ts --email=<EMAIL> --password=<PW> [--name=<NAME>]");
    process.exit(1);
  }
  const email = normalizeEmail(rawEmail);
  const passwordHash = await hashPassword(password);
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  const [row] = existing
    ? await db.update(users).set({ passwordHash, role: "admin", displayName, updatedAt: new Date() }).where(eq(users.id, existing.id)).returning()
    : await db.insert(users).values({ email, passwordHash, displayName, role: "admin" }).returning();
  console.log(`${existing ? "갱신" : "생성"}: ${row.email} / role=${row.role} / name=${row.displayName} / id=${row.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
