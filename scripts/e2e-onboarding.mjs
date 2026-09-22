// 첫 로그인 온보딩 E2E — JS 없이 폼 POST 로 서버 액션을 부른다(e2e-auth 와 같은 방식). dev 서버가 떠 있어야 한다.
// 사용: node scripts/e2e-onboarding.mjs [baseUrl]   (기본 http://127.0.0.1:4000)
//
// 여기서 지키려는 것 넷:
//  1) 가입 직후 /welcome 으로 간다
//  2) 동의 전에는 어떤 질문도 열리지 않는다(주소를 직접 쳐도)
//  3) 단계마다 즉시 저장된다 — 되돌아가면 고른 값이 그대로 보인다
//  4) 결과 화면에 닿는 순간 마침이 찍혀, 다시 /welcome 을 열면 붙잡지 않는다
const base = process.argv[2] ?? "http://127.0.0.1:4000";
const email = `e2e-onb+${Date.now()}@example.com`;
const password = "Test1234!";
let failures = 0;

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

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'");

/** 지정 경로의 form 에서 $ACTION 히든 필드를 뽑는다 */
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

const post = (path, fd, cookie) => fetch(base + path, { method: "POST", body: fd, redirect: "manual", headers: cookie ? { cookie } : {} });

/** 루트 loading.tsx 아래에서는 redirect 가 200 + meta refresh 로 나온다(e2e-auth 주석) */
async function redirectedTo(res) {
  if ([303, 307, 308].includes(res.status)) return res.headers.get("location") ?? "";
  const html = await res.text();
  return /id="__next-page-redirect"[^>]*content="\d+;url=([^"]+)"/.exec(html)?.[1] ?? null;
}

async function get(path, cookie) {
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {} , redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), html: res.status === 200 ? await res.text() : "" };
}

// 0) 가입 — next 를 안 주면 온보딩으로 가야 한다
let cookie;
{
  const { fd } = await actionFields("/sign-up");
  fd.set("displayName", "온보딩테스터");
  fd.set("email", email);
  fd.set("password", password);
  fd.set("passwordConfirm", password);
  fd.set("terms", "on");
  const res = await post("/sign-up", fd);
  const raw = res.headers.getSetCookie?.() ?? [];
  cookie = raw.find((c) => c.startsWith("sjd_session="))?.split(";")[0];
  const html = await res.text();
  check("가입 성공 → 세션 쿠키", Boolean(cookie));
  check("가입 직후 갈 곳이 /welcome", html.includes('\\"/welcome\\"') || html.includes('"/welcome"'), "액션 결과의 redirectTo");
}
if (!cookie) {
  console.log("\n세션을 못 받아 이후 검사를 건너뜁니다.");
  process.exit(1);
}

// 1) 동의 전 관문 — 질문 주소를 직접 쳐도 intro 로 돌려보낸다
{
  const r = await get("/welcome/platforms", cookie);
  const to = r.location ?? /url=([^"]+)/.exec(r.html)?.[1] ?? "";
  check("동의 전 /welcome/platforms → intro 로 되돌림", to.includes("/welcome/intro"), to);
}

// 2) /welcome 은 재개 지점으로 넘긴다
{
  const r = await get("/welcome", cookie);
  const to = r.location ?? /url=([^"]+)/.exec(r.html)?.[1] ?? "";
  check("/welcome → 재개 지점(intro)", to.includes("/welcome/intro"), to);
}

// 3) 동의 없이 제출하면 다시 intro 로, 사유를 달고
{
  const { fd } = await actionFields("/welcome/intro", cookie);
  fd.set("step", "intro");
  const res = await post("/welcome/intro", fd, cookie);
  const to = await redirectedTo(res);
  check("동의 체크 없이 시작 → consent=required", (to ?? "").includes("consent=required"), to ?? "");
}

// 4) 동의 → platforms
{
  const { fd } = await actionFields("/welcome/intro", cookie);
  fd.set("step", "intro");
  fd.set("consent", "on");
  const res = await post("/welcome/intro", fd, cookie);
  const to = await redirectedTo(res);
  check("동의 → /welcome/platforms", (to ?? "").includes("/welcome/platforms"), to ?? "");
}

// 5) 플랫폼 저장 → 되돌아가면 고른 값이 남아 있다
{
  const { fd } = await actionFields("/welcome/platforms", cookie);
  fd.set("step", "platforms");
  fd.append("platforms", "steam");
  fd.append("platforms", "ps5");
  const res = await post("/welcome/platforms", fd, cookie);
  const to = await redirectedTo(res);
  check("플랫폼 저장 → 다음 단계(genres)", (to ?? "").includes("/welcome/genres"), to ?? "");

  const back = await get("/welcome/platforms", cookie);
  const checkedSteam = /value="steam"[^>]*checked|checked[^>]*value="steam"/.test(back.html);
  check("되돌아가면 고른 플랫폼이 체크돼 있다", checkedSteam);
}

// 6) 건너뛰기는 값을 저장하지 않고 넘어간다
{
  const { fd } = await actionFields("/welcome/genres", cookie);
  fd.set("step", "genres");
  fd.set("skip", "1");
  const res = await post("/welcome/genres", fd, cookie);
  const to = await redirectedTo(res);
  check("장르 건너뛰기 → deal-style", (to ?? "").includes("/welcome/deal-style"), to ?? "");
}

// 7) 단일선택 두 단계
for (const [step, name, value, nextPath] of [
  ["deal-style", "dealStyle", "wait_deep", "/welcome/play-time"],
  ["play-time", "playTimeStyle", "medium", "/welcome/subscriptions"],
]) {
  const { fd } = await actionFields(`/welcome/${step}`, cookie);
  fd.set("step", step);
  fd.set(name, value);
  const res = await post(`/welcome/${step}`, fd, cookie);
  const to = await redirectedTo(res);
  check(`${step} 저장 → ${nextPath}`, (to ?? "").includes(nextPath), to ?? "");
}

// 8) 마지막 질문 → 결과
{
  const { fd } = await actionFields("/welcome/subscriptions", cookie);
  fd.set("step", "subscriptions");
  fd.set("skip", "1");
  const res = await post("/welcome/subscriptions", fd, cookie);
  const to = await redirectedTo(res);
  check("마지막 질문 → /welcome/done", (to ?? "").includes("/welcome/done"), to ?? "");
}

// 9) 결과 화면이 실제로 서고, 받은 값을 되읊는다
{
  const r = await get("/welcome/done", cookie);
  check("결과 화면 200", r.status === 200, String(r.status));
  check("결과 화면이 고른 플랫폼을 되읊는다", r.html.includes("Steam") && r.html.includes("PS5"));
  check("결과 화면이 할인 성향을 되읊는다", r.html.includes("반값은 돼야죠"));
  check('"내 조건으로 보기" 가 고른 플랫폼을 주소에 싣는다', /\/games\?platform=steam(%2C|,)ps5/.test(r.html), /href="(\/games[^"]*)"/.exec(r.html)?.[1] ?? "");
}

// 10) 마친 사람은 다시 붙잡지 않는다
{
  const r = await get("/welcome", cookie);
  const to = r.location ?? /url=([^"]+)/.exec(r.html)?.[1] ?? "";
  check("마친 뒤 /welcome → 홈", to === "/" || to.endsWith("/"), to);
}

console.log(failures ? `\n실패 ${failures}건` : "\n전부 통과");
process.exit(failures ? 1 : 0);
