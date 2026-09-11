// 인증 E2E (JS 없는 progressive-enhancement 폼 POST로 Server Action 호출). dev 서버가 떠 있어야 한다.
// 사용: node scripts/e2e-auth.mjs [baseUrl]   (기본 http://127.0.0.1:3000)
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const email = `e2e+${Date.now()}@example.com`;
const password = "Test1234!";
const displayName = "E2E테스터";
let failures = 0;

// 반복 실행이 가입 레이트리밋(IP당 시간 5회)에 걸리지 않도록 테스트 전 키 초기화 (레이트리밋 자체는 동작 확인됨)
try {
  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  });
  const keys = await redis.keys("rl:auth:*");
  if (keys.length) await redis.del(...keys);
  console.log(`setup: 레이트리밋 키 ${keys.length}개 초기화`);
} catch (e) {
  console.log("setup: Redis 초기화 생략:", e?.message ?? e);
}

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function decode(s) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
}

/** 페이지 HTML에서 지정 form의 $ACTION 히든 필드를 뽑는다 */
async function actionFields(path, cookie) {
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const html = await res.text();
  const form = html.split(/<form[^>]*method="POST"[^>]*>/)[1]?.split("</form>")[0] ?? "";
  const fd = new FormData();
  for (const tag of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = /name="([^"]+)"/.exec(tag[0])?.[1];
    const value = /value="([^"]*)"/.exec(tag[0])?.[1] ?? "";
    if (name && name.startsWith("$ACTION")) fd.set(name, decode(value));
  }
  return { status: res.status, fd, html };
}

function cookieOf(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const sess = raw.find((c) => c.startsWith("sjd_session="));
  return { raw: sess ?? null, pair: sess ? sess.split(";")[0] : null };
}

/** Next는 루트 loading.tsx(Suspense) 아래에서 redirect()가 나면 셸을 먼저 흘려보내고 <meta refresh>로 이동시킨다(200). 307과 둘 다 리다이렉트로 본다 */
async function redirectedTo(res) {
  if (res.status === 307 || res.status === 308 || res.status === 303) return res.headers.get("location") ?? "";
  const html = await res.text();
  const m = /id="__next-page-redirect"[^>]*content="\d+;url=([^"]+)"/.exec(html);
  return m ? m[1] : null;
}

async function post(path, fd, cookie) {
  return fetch(base + path, { method: "POST", body: fd, redirect: "manual", headers: cookie ? { cookie } : {} });
}

// 1) 회원가입 — 잘못된 입력은 400대가 아니라 같은 페이지에 에러 렌더 (Server Action 특성)
{
  const { fd } = await actionFields("/sign-up");
  fd.set("displayName", displayName);
  fd.set("email", email);
  fd.set("password", "short");
  fd.set("passwordConfirm", "short");
  fd.set("terms", "on");
  fd.set("next", "/settings");
  const res = await post("/sign-up", fd);
  const html = await res.text();
  check("가입: 짧은 비밀번호 → 필드 에러 표시, 쿠키 없음", res.status === 200 && html.includes("8자 이상") && !cookieOf(res).pair);
}

let sessionCookie;
{
  const { fd } = await actionFields("/sign-up");
  fd.set("displayName", displayName);
  fd.set("email", email);
  fd.set("password", password);
  fd.set("passwordConfirm", password);
  fd.set("terms", "on");
  fd.set("next", "/settings");
  const res = await post("/sign-up", fd);
  const c = cookieOf(res);
  sessionCookie = c.pair;
  check("가입 성공 → 세션 쿠키 발급", Boolean(c.pair), c.raw?.replace(/=[^;]+/, "=<token>"));
  check("쿠키 속성 HttpOnly + SameSite=Lax + Path=/", /HttpOnly/i.test(c.raw ?? "") && /SameSite=Lax/i.test(c.raw ?? "") && /Path=\//.test(c.raw ?? ""));
}

// 2) 중복 가입 거부
{
  const { fd } = await actionFields("/sign-up");
  fd.set("displayName", displayName);
  fd.set("email", email.toUpperCase());
  fd.set("password", password);
  fd.set("passwordConfirm", password);
  fd.set("terms", "on");
  const res = await post("/sign-up", fd);
  const html = await res.text();
  check("가입: 같은 이메일(대문자) 재가입 → 이미 가입 안내", html.includes("이미 가입된 이메일"));
}

// 3) 세션으로 보호 페이지 접근
{
  const res = await fetch(base + "/settings", { headers: { cookie: sessionCookie }, redirect: "manual" });
  const html = await res.text();
  check("/settings 200 + 이메일 표시", res.status === 200 && html.includes(email));
  const me = await (await fetch(base + "/api/auth/me", { headers: { cookie: sessionCookie } })).json();
  check("/api/auth/me → user (passwordHash 미노출)", me.user?.email === email && !("passwordHash" in (me.user ?? {})), JSON.stringify(me));
  const si = await fetch(base + "/sign-in", { headers: { cookie: sessionCookie }, redirect: "manual" });
  const siTo = await redirectedTo(si);
  check("로그인 상태로 /sign-in → 홈으로 리다이렉트", siTo !== null && (siTo === "/" || siTo.endsWith(":3000/")), `→ ${siTo}`);
}

// 4) 로그인 실패/성공
{
  const { fd } = await actionFields("/sign-in");
  fd.set("email", email);
  fd.set("password", "wrong-password1");
  const res = await post("/sign-in", fd);
  const html = await res.text();
  check("로그인: 틀린 비밀번호 → 공통 에러(열거 방지), 쿠키 없음", html.includes("이메일 또는 비밀번호") && !cookieOf(res).pair);
}
{
  const { fd } = await actionFields("/sign-in");
  fd.set("email", "nobody-" + email);
  fd.set("password", password);
  const res = await post("/sign-in", fd);
  const html = await res.text();
  check("로그인: 없는 계정 → 같은 공통 에러", html.includes("이메일 또는 비밀번호"));
}
let cookie2;
{
  const { fd } = await actionFields("/sign-in");
  fd.set("email", email);
  fd.set("password", password);
  fd.set("next", "//evil.com");
  const res = await post("/sign-in", fd);
  cookie2 = cookieOf(res).pair;
  check("로그인 성공 → 새 세션 쿠키", Boolean(cookie2) && cookie2 !== sessionCookie);
}

// 5) 로그아웃 — signOutAction을 Next-Action 헤더로 직접 호출 (버튼은 클라이언트 onClick)
{
  const manifest = JSON.parse(await (await import("node:fs/promises")).readFile(".next/dev/server/server-reference-manifest.json", "utf8"));
  const node = manifest.node ?? {};
  let actionId = null;
  for (const [id, entry] of Object.entries(node)) {
    const workers = entry.workers ?? {};
    const key = Object.keys(workers).find((k) => k.includes("sign-in") || k.includes("sign-up") || k.includes("(auth)"));
    if (!key) continue;
    // 매니페스트에는 export 이름이 없으므로 액션 파일 원본에서 export 순서로 유추 대신, 세 액션 모두 호출해 쿠키가 지워지는 것을 찾는다
    actionId = actionId ?? [];
    actionId.push(id);
  }
  let cleared = false;
  for (const id of actionId ?? []) {
    const res = await fetch(base + "/", {
      method: "POST",
      headers: { "Next-Action": id, "content-type": "text/plain;charset=UTF-8", cookie: cookie2, accept: "text/x-component" },
      body: "[]",
      redirect: "manual",
    });
    const raw = res.headers.getSetCookie?.() ?? [];
    if (raw.some((c) => c.startsWith("sjd_session=;") || /sjd_session=;? ?Expires=Thu, 01 Jan 1970/i.test(c))) {
      cleared = true;
      break;
    }
  }
  check("로그아웃 액션 → 세션 쿠키 삭제(Set-Cookie 만료)", cleared);
  const after = await (await fetch(base + "/api/auth/me", { headers: { cookie: cookie2 } })).json();
  check("로그아웃 후 같은 쿠키로 /api/auth/me → null (DB 세션 폐기)", after.user === null, JSON.stringify(after));
  const guard = await fetch(base + "/settings", { headers: { cookie: cookie2 }, redirect: "manual" });
  const guardTo = await redirectedTo(guard);
  check("로그아웃 후 /settings(폐기 쿠키) → 로그인으로 리다이렉트(에러 화면 아님)", (guardTo ?? "").includes("/sign-in?next=%2Fsettings"), `status ${guard.status} → ${guardTo}`);
  const siDead = await fetch(base + "/sign-in", { headers: { cookie: cookie2 }, redirect: "manual" });
  check("폐기 쿠키로 /sign-in → 로그인 폼 200 (재로그인 가능)", siDead.status === 200);
}

// 6) 테스트 계정 정리 (sessions는 cascade)
try {
  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql.query("delete from users where email like 'e2e+%@example.com' returning id");
  console.log(`cleanup: e2e 계정 ${rows.length}개 삭제`);
} catch (e) {
  console.log("cleanup 실패(무시):", e?.message ?? e);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
