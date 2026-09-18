// 매장 축 끝단 시험 — 가입, 입점 신청, 승인, 물건 등록을 실제 화면 경로(Server Action 폼 POST)로 한 바퀴.
// 사용: node scripts/e2e-shops.mjs [baseUrl]   (기본 http://127.0.0.1:4000)
//
// **DB 에 실제로 행을 만든다.** 그래서 기본 대상이 로컬이다 — 프로덕션에 돌리려면 주소를 손으로 적어
// 넘긴다. 시험 계정과 매장은 끝에서 스스로 지우고, 무엇이 남았는지 마지막 줄에 센다.
// 2026-09-18 프로덕션 실측으로 8단계 전부 통과했다.
//
// 되돌리기: 끝에서 만든 것을 전부 지운다(--keep 을 주면 남긴다). 수동 정리가 필요하면:
//   delete from shop_stock_events where listing_id in (select id from shop_listings where shop_id = '<SHOP>');
//   delete from shop_listings where shop_id = '<SHOP>';
//   delete from products where registered_shop_id = '<SHOP>';
//   delete from shop_staff where shop_id = '<SHOP>';
//   delete from shops where id = '<SHOP>';
//   delete from sessions where user_id in ('<USER>','<ADMIN>');
//   delete from users where id in ('<USER>','<ADMIN>');
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";

loadEnv({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);

const base = process.argv[2] ?? "http://127.0.0.1:4000";
const keep = process.argv.includes("--keep");
const stamp = Date.now();
const MARK = `e2e-${stamp}`;
const owner = { email: `e2e-shop+${stamp}@example.com`, password: "Test1234!", name: "시험매장주" };
const shop = { name: `시험매장 ${stamp}`, slug: `e2e-shop-${stamp}` };
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

function decode(s) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
}

/** 페이지 HTML 에서 지정 form 의 $ACTION 히든 필드를 뽑는다(e2e-auth.mjs 와 같은 방법) */
async function actionFields(path, cookie, formIndex = 1) {
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const html = await res.text();
  const form = html.split(/<form[^>]*method="POST"[^>]*>/)[formIndex]?.split("</form>")[0] ?? "";
  const fd = new FormData();
  for (const tag of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = /name="([^"]+)"/.exec(tag[0])?.[1];
    const value = /value="([^"]*)"/.exec(tag[0])?.[1] ?? "";
    if (name && name.startsWith("$ACTION")) fd.set(name, decode(value));
  }
  return { status: res.status, fd, html, formCount: html.split(/<form[^>]*method="POST"[^>]*>/).length - 1 };
}

function cookieOf(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const sess = raw.find((c) => c.startsWith("sjd_session="));
  return sess ? sess.split(";")[0] : null;
}

async function post(path, fd, cookie) {
  return fetch(base + path, { method: "POST", body: fd, redirect: "manual", headers: cookie ? { cookie } : {} });
}

async function signIn(email, password) {
  const { fd } = await actionFields("/sign-in");
  fd.set("email", email);
  fd.set("password", password);
  const res = await post("/sign-in", fd);
  return cookieOf(res);
}

const ids = { ownerId: null, adminId: null, shopId: null };

async function main() {
  console.log(`대상: ${base}`);
  console.log(`표식: ${MARK} (매장 slug ${shop.slug})\n`);

  // 1) 매장주 가입 — 공개 경로 그대로
  let ownerCookie;
  {
    const { fd } = await actionFields("/sign-up");
    fd.set("displayName", owner.name);
    fd.set("email", owner.email);
    fd.set("password", owner.password);
    fd.set("passwordConfirm", owner.password);
    fd.set("terms", "on");
    const res = await post("/sign-up", fd);
    ownerCookie = cookieOf(res);
    check("1. 매장주 가입 → 세션 쿠키", Boolean(ownerCookie));
    if (!ownerCookie) return;
    const [u] = await sql`select id from users where email = ${owner.email}`;
    ids.ownerId = u?.id ?? null;
    check("1b. users 행 생김", Boolean(ids.ownerId), ids.ownerId ?? "");
  }

  // 2) 입점 신청 — 신청서가 곧 매장이고 처음 상태는 pending 이다
  {
    const { fd, formCount } = await actionFields("/shops/join", ownerCookie);
    fd.set("shopType", "business");
    fd.set("name", shop.name);
    fd.set("slug", shop.slug);
    fd.set("bizRegNo", "1234567890");
    fd.set("addressType", "offline");
    fd.set("address", "서울 용산구 한강대로 23길 55");
    fd.set("addressDetail", "아이파크몰 6층");
    fd.set("phone", "0212345678");
    fd.set("description", `끝단 시험용 매장입니다 (${MARK})`);
    const res = await post("/shops/join", fd, ownerCookie);
    const html = await res.text();
    const [row] = await sql`select id, status from shops where slug = ${shop.slug}`;
    ids.shopId = row?.id ?? null;
    check("2. 입점 신청 → shops 행", Boolean(ids.shopId), `status=${row?.status ?? "없음"} form=${formCount} http=${res.status}`);
    check("2b. 처음 상태는 pending", row?.status === "pending", row?.status ?? "");
    if (!ids.shopId) console.log("   응답 일부:", html.slice(0, 300).replace(/\s+/g, " "));
  }

  // 3) 심사 중 매장 페이지는 손님에게 404 본문이다(3단계 결정)
  {
    const res = await fetch(`${base}/shops/${shop.slug}`, { redirect: "manual" });
    const html = await res.text();
    check("3. 심사 중 매장 페이지는 손님에게 안 보인다", !html.includes(shop.name), `http=${res.status}`);
  }

  // 4) 관리자 승인 — 시험용 관리자를 따로 만든다(있는 계정의 비밀번호를 건드리지 않는다)
  let adminCookie;
  {
    const adminEmail = `e2e-admin+${stamp}@example.com`;
    const { execFileSync } = await import("node:child_process");
    execFileSync("npx", ["tsx", "scripts/create-admin.ts", `--email=${adminEmail}`, `--password=${owner.password}`, "--name=시험관리자"], {
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    const [a] = await sql`select id from users where email = ${adminEmail}`;
    ids.adminId = a?.id ?? null;
    adminCookie = await signIn(adminEmail, owner.password);
    check("4. 시험 관리자 로그인", Boolean(adminCookie && ids.adminId));

    const { fd } = await actionFields("/shops/admin", adminCookie);
    fd.set("shopId", ids.shopId);
    fd.set("decision", "approve");
    const res = await post("/shops/admin", fd, adminCookie);
    const [row] = await sql`select status, approved_at from shops where id = ${ids.shopId}`;
    check("4b. 승인 → status=active", row?.status === "active", `status=${row?.status} http=${res.status}`);
    check("4c. 승인 시각이 찍힌다", Boolean(row?.approved_at));
  }

  // 5) 승인 뒤 매장 페이지가 손님에게 열린다
  {
    const res = await fetch(`${base}/shops/${shop.slug}`, { redirect: "manual" });
    const html = await res.text();
    check("5. 승인 뒤 매장 페이지 공개", res.status === 200 && html.includes(shop.name), `http=${res.status}`);
  }

  // 6) 물건 등록 — 상품과 판매 줄이 한 폼에서 같이 생긴다
  {
    const path = `/vendor/${shop.slug}/listings`;
    const page = await actionFields(path, ownerCookie);
    // split 결과의 [0] 은 첫 폼 앞의 글이라 폼 n 개면 색인은 1..n 이다. 물건 추가는 마지막 폼이다
    const { fd } = await actionFields(path, ownerCookie, page.formCount);
    fd.set("name", `시험 상품 ${stamp}`);
    fd.set("barcode", String(8800000000000 + (stamp % 100000)));
    fd.set("hardwareCode", "");
    fd.set("condition", "used");
    fd.set("status", "selling");
    fd.set("priceMinor", "35000");
    fd.set("onHand", "3");
    const res = await post(path, fd, ownerCookie);
    const rows = await sql`
      select l.id, l.price_minor, l.on_hand, l.status, p.name
      from shop_listings l join products p on p.id = l.product_id
      where l.shop_id = ${ids.shopId}`;
    check("6. 물건 등록 → shop_listings 행", rows.length === 1, `행 ${rows.length} http=${res.status} 폼 ${page.formCount}개`);
    check("6b. 값과 재고가 적은 대로", rows[0]?.price_minor === 35000 && rows[0]?.on_hand === 3, JSON.stringify(rows[0] ?? {}));
    const events = await sql`
      select before_qty, after_qty, reason from shop_stock_events
      where listing_id in (select id from shop_listings where shop_id = ${ids.shopId})`;
    check("6c. 재고 이력이 첫 줄부터 남는다", events.length === 1 && events[0]?.after_qty === 3, JSON.stringify(events[0] ?? {}));
  }

  // 7) 손님 화면에 그 물건이 뜬다
  {
    const res = await fetch(`${base}/shops/${shop.slug}`, { redirect: "manual" });
    const html = await res.text();
    check("7. 매장 페이지에 파는 물건이 뜬다", html.includes(`시험 상품 ${stamp}`), `http=${res.status}`);
  }

  // 8) 매핑 배치가 볼 수 있는 모양인가 — gameId 가 비었고 확인 시각도 비어 있어야 큐에 든다
  {
    const [p] = await sql`select game_id, game_match_checked_at from products where registered_shop_id = ${ids.shopId}`;
    check("8. 게임 안 고른 상품은 매핑 배치 큐에 든다", p && p.game_id === null && p.game_match_checked_at === null, JSON.stringify(p ?? {}));
  }
}

async function cleanup() {
  if (keep) {
    console.log("\n--keep 이라 남긴다:", JSON.stringify(ids));
    return;
  }
  if (ids.shopId) {
    await sql`delete from shop_stock_events where listing_id in (select id from shop_listings where shop_id = ${ids.shopId})`;
    await sql`delete from shop_listings where shop_id = ${ids.shopId}`;
    await sql`delete from product_components where product_id in (select id from products where registered_shop_id = ${ids.shopId})`;
    await sql`delete from products where registered_shop_id = ${ids.shopId}`;
    await sql`delete from shop_staff where shop_id = ${ids.shopId}`;
    await sql`delete from shops where id = ${ids.shopId}`;
  }
  const users = [ids.ownerId, ids.adminId].filter(Boolean);
  if (users.length > 0) {
    await sql`delete from sessions where user_id = any(${users})`;
    await sql`delete from users where id = any(${users})`;
  }
  const [left] = await sql`select count(*)::int as n from shops where slug = ${shop.slug}`;
  console.log(`\n정리 완료 — 남은 시험 매장 ${left.n}건, 지운 계정 ${users.length}개`);
}

main()
  .catch((e) => {
    failures++;
    console.error("실패:", String(e).slice(0, 500));
  })
  .then(cleanup)
  .then(() => {
    console.log(failures === 0 ? "\n전부 통과" : `\n실패 ${failures}건`);
    process.exit(failures === 0 ? 0 : 1);
  });
