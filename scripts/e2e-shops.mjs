// 매장 축 끝단 시험 — 가입, 입점 신청, 승인, 물건 등록, CSV, 바코드 조회, 직원 초대를 서버 액션으로 한 바퀴.
// 사용: node scripts/e2e-shops.mjs [baseUrl]   (기본 http://127.0.0.1:4000, dev 서버가 떠 있어야 한다)
//
// **DB 에 실제로 행을 만든다.** 로컬 DB 가 곧 운영이다. 시험 계정, 매장, 상품은 끝에서 스스로 지우고
// 무엇이 남았는지 마지막 줄에 센다(--keep 을 주면 남긴다).
//
// 2026-09-23(62e6215)부터 폼이 <form action> 이 아니라 onSubmit 으로 액션을 부른다(ui/action-form 주석).
// 페이지에 $ACTION 숨김 칸이 없어 이 대본은 그날부터 가입에서 멈춰 있었다(2026-09-26 확인).
// 그래서 액션 ID 를 dev 매니페스트에서 **파일과 이름으로** 찾아 Next-Action 헤더로 직접 부른다(callAction).
// 매니페스트는 dev 전용이라 운영 주소로는 못 돈다 — 운영 확인은 화면 GET 만 한다.
//
// 수동 정리가 필요하면(표식 e2e-shop+<stamp>, e2e-staff+<stamp>, e2e-admin+<stamp>):
//   delete from shops where slug = 'e2e-shop-<stamp>';   -- 판매 줄, 직원, 초대는 cascade
//   delete from products where registered_shop_id = '<SHOP>';
//   delete from users where email like 'e2e-%+<stamp>@example.com';
import { config as loadEnv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

loadEnv({ path: ".env.local", quiet: true });
const sql = neon(process.env.DATABASE_URL);

const base = process.argv[2] ?? "http://127.0.0.1:4000";
const keep = process.argv.includes("--keep");
const stamp = Date.now();
const MARK = `e2e-${stamp}`;
// 쉬운 비번은 가입에서 거절된다(lib/auth/weak-password) — 흔한 꼴을 피한 값
const PASSWORD = "Gm!9vQz2-shop";
const owner = { email: `e2e-shop+${stamp}@example.com`, name: "시험매장주" };
const staff = { email: `e2e-staff+${stamp}@example.com`, name: "시험알바" };
const shop = { name: `시험매장 ${stamp}`, slug: `e2e-shop-${stamp}` };
const BARCODE = String(8800000000000 + (stamp % 100000));
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

/** 가입, 로그인 레이트리밋을 비운다 — 한 대본이 가입을 셋 한다 */
async function resetRateLimit() {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
    });
    const keys = await redis.keys("rl:auth:*");
    if (keys.length) await redis.del(...keys);
  } catch (e) {
    console.log("setup: Redis 초기화 생략:", e?.message ?? e);
  }
}

/**
 * 액션 ID. 페이지를 한 번 열어야 dev 가 그 페이지를 컴파일하고 매니페스트에 액션을 올린다.
 * 같은 이름이 파일마다 있을 수 있어(여러 actions.ts) 파일 조각까지 맞춘다.
 */
async function actionId(page, cookie, fileFragment, name) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const manifest = JSON.parse(await readFile(".next/dev/server/server-reference-manifest.json", "utf8"));
    const hit = Object.entries(manifest.node ?? {}).find(([, e]) => e.exportedName === name && e.filename?.includes(fileFragment));
    if (hit) return hit[0];
    await fetch(base + page, { headers: cookie ? { cookie } : {}, redirect: "manual" }).then((r) => r.text());
  }
  throw new Error(`액션을 못 찾았다: ${fileFragment} ${name}`);
}

/**
 * 서버 액션을 브라우저처럼 부른다. `args` 는 앞에서부터 bind 된 인자 + 호출 인자이고,
 * 폼이 있으면 `"$K1"` 자리에 FormData 가 들어간다(react-server-dom 인코딩: 칸은 "_1_" 접두, 루트 "0" 은 **마지막**).
 */
async function callAction({ page, file, name, cookie, args, fields }) {
  const id = await actionId(page, cookie, file, name);
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields ?? {})) fd.set(`_1_${k}`, v);
  fd.set("0", JSON.stringify(args));
  const res = await fetch(base + page, {
    method: "POST",
    headers: { "Next-Action": id, accept: "text/x-component", ...(cookie ? { cookie } : {}) },
    body: fd,
    redirect: "manual",
  });
  const setCookie = (res.headers.getSetCookie?.() ?? []).find((c) => /^sjd_session=[^;]/.test(c))?.split(";")[0] ?? null;
  return { status: res.status, text: await res.text(), setCookie, redirect: res.headers.get("x-action-redirect") };
}

async function signUp(who) {
  const r = await callAction({
    page: "/sign-up",
    file: "(auth)/actions",
    name: "signUpAction",
    args: [null, "$K1"],
    fields: { displayName: who.name, email: who.email, password: PASSWORD, passwordConfirm: PASSWORD, terms: "on" },
  });
  return r.setCookie;
}

async function signIn(email) {
  const r = await callAction({
    page: "/sign-in",
    file: "(auth)/actions",
    name: "signInAction",
    args: [null, "$K1"],
    fields: { email, password: PASSWORD },
  });
  return r.setCookie;
}

const ids = { ownerId: null, staffId: null, adminId: null, shopId: null };

async function main() {
  console.log(`대상: ${base}`);
  console.log(`표식: ${MARK} (매장 slug ${shop.slug})\n`);
  await resetRateLimit();

  // 1) 매장주 가입
  const ownerCookie = await signUp(owner);
  check("1. 매장주 가입 → 세션 쿠키", Boolean(ownerCookie));
  if (!ownerCookie) return;
  ids.ownerId = (await sql`select id from users where email = ${owner.email}`)[0]?.id ?? null;

  // 2) 입점 신청 — 신청서가 곧 매장이고 처음 상태는 pending 이다
  {
    const r = await callAction({
      page: "/shops/join",
      file: "shops/join/actions",
      name: "applyForShopAction",
      cookie: ownerCookie,
      args: [null, "$K1"],
      fields: {
        shopType: "business",
        name: shop.name,
        slug: shop.slug,
        bizRegNo: "1234567890",
        addressType: "offline",
        address: "서울 용산구 한강대로 23길 55",
        addressDetail: "아이파크몰 6층",
        phone: "0212345678",
        description: `끝단 시험용 매장입니다 (${MARK})`,
      },
    });
    const [row] = await sql`select id, status from shops where slug = ${shop.slug}`;
    ids.shopId = row?.id ?? null;
    check("2. 입점 신청 → shops 행, pending", row?.status === "pending", `status=${row?.status ?? "없음"} http=${r.status}`);
    if (!ids.shopId) return console.log("   응답 일부:", r.text.slice(0, 300));
  }

  // 3) 심사 중 매장 페이지는 손님에게 안 보인다
  {
    const html = await fetch(`${base}/shops/${shop.slug}`).then((r) => r.text());
    check("3. 심사 중 매장 페이지는 손님에게 안 보인다", !html.includes(shop.name));
  }

  // 4) 관리자 승인 — 시험용 관리자를 따로 만든다(있는 계정의 비밀번호를 건드리지 않는다)
  let adminCookie;
  {
    const adminEmail = `e2e-admin+${stamp}@example.com`;
    const { execFileSync } = await import("node:child_process");
    execFileSync("npx", ["tsx", "scripts/create-admin.ts", `--email=${adminEmail}`, `--password=${PASSWORD}`, "--name=시험관리자"], {
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    ids.adminId = (await sql`select id from users where email = ${adminEmail}`)[0]?.id ?? null;
    adminCookie = await signIn(adminEmail);
    check("4. 시험 관리자 로그인", Boolean(adminCookie && ids.adminId));

    await callAction({
      page: "/shops/admin",
      file: "shops/admin/actions",
      name: "reviewShopAction",
      cookie: adminCookie,
      args: [null, "$K1"],
      fields: { shopId: ids.shopId, decision: "approve" },
    });
    const [row] = await sql`select status, approved_at from shops where id = ${ids.shopId}`;
    check("4b. 승인 → active, 승인 시각", row?.status === "active" && Boolean(row?.approved_at), `status=${row?.status}`);
  }

  // 5) 승인 뒤 매장 페이지가 열린다
  {
    const res = await fetch(`${base}/shops/${shop.slug}`);
    const html = await res.text();
    check("5. 승인 뒤 매장 페이지 공개", res.status === 200 && html.includes(shop.name), `http=${res.status}`);
  }

  const listingsPage = `/vendor/${shop.slug}/listings`;
  const listingAction = (name, args, fields, cookie = ownerCookie) =>
    callAction({ page: listingsPage, file: "listings/actions", name, cookie, args, fields });

  // 6) 물건 등록 — 상품과 판매 줄이 한 폼에서 같이 생긴다
  {
    await listingAction("createListingAction", [shop.slug, null, "$K1"], {
      name: `시험 상품 ${stamp}`,
      barcode: BARCODE,
      hardwareCode: "",
      condition: "used",
      status: "selling",
      priceMinor: "35000",
      onHand: "3",
    });
    const rows = await sql`select l.price_minor, l.on_hand, l.source from shop_listings l where l.shop_id = ${ids.shopId}`;
    check("6. 물건 등록 → 판매 줄 1, 값과 재고 그대로", rows.length === 1 && rows[0].price_minor === 35000 && rows[0].on_hand === 3, JSON.stringify(rows));
    const ev = await sql`select after_qty, reason from shop_stock_events where listing_id in (select id from shop_listings where shop_id = ${ids.shopId})`;
    check("6b. 재고 이력이 첫 줄부터(manual)", ev.length === 1 && ev[0].reason === "manual", JSON.stringify(ev));
  }

  // 7) 손님 화면에 그 물건이 뜬다
  {
    const html = await fetch(`${base}/shops/${shop.slug}`).then((r) => r.text());
    check("7. 매장 페이지에 파는 물건이 뜬다", html.includes(`시험 상품 ${stamp}`));
  }

  // 8) 매핑 배치 큐 — 게임 안 고른 상품은 gameId, 확인 시각이 비어 있다
  {
    const [p] = await sql`select game_id, game_match_checked_at from products where registered_shop_id = ${ids.shopId}`;
    check("8. 게임 안 고른 상품은 매핑 배치 큐에 든다", p && p.game_id === null && p.game_match_checked_at === null);
  }

  // 9) 바코드 조회 — 이미 있는 바코드면 그 상품 이름이 돌아온다
  {
    const hit = await listingAction("lookupBarcodeAction", [shop.slug, BARCODE]);
    const miss = await listingAction("lookupBarcodeAction", [shop.slug, "9990000000001"]);
    check("9. 바코드 조회: 있는 것은 이름, 없는 것은 null", hit.text.includes(`시험 상품 ${stamp}`) && !miss.text.includes("시험 상품"), `http=${hit.status}`);
  }

  // 10) CSV — 같은 바코드는 고치고, 새 이름은 만들고, 틀린 줄은 줄 번호와 함께 따로 실패한다
  {
    const csv = [
      "상품명,바코드,기종,상태,판매가,수량,공개",
      `시험 상품 ${stamp},${BARCODE},,중고,"33,000원",5,판매 중`,
      `CSV 상품 ${stamp},,닌텐도 스위치,새 제품,12000,2,작성 중`,
      `틀린 줄 ${stamp},,없는 기종,중고,1000,1,`,
    ].join("\r\n");
    const r = await listingAction("importCsvAction", [shop.slug, null, "$K1"], { csv });
    const rows = await sql`
      select p.name, l.price_minor, l.on_hand, l.status, l.source
      from shop_listings l join products p on p.id = l.product_id
      where l.shop_id = ${ids.shopId} order by p.name`;
    const updated = rows.find((x) => x.name === `시험 상품 ${stamp}`);
    const created = rows.find((x) => x.name === `CSV 상품 ${stamp}`);
    check("10. CSV: 판매 줄 2(고침 1, 새로 1)", rows.length === 2, JSON.stringify(rows));
    check("10b. 같은 바코드 줄은 값과 수량만 고쳐진다", updated?.price_minor === 33000 && updated?.on_hand === 5 && updated?.source === "csv");
    check("10c. 새 줄은 csv 출처, 작성 중", created?.source === "csv" && created?.status === "draft");
    check("10d. 틀린 줄은 4번째 줄로 알려 준다", r.text.includes("4번째 줄"), r.text.slice(0, 200).replace(/\s+/g, " "));
    const ev = await sql`
      select before_qty, after_qty, reason from shop_stock_events
      where listing_id in (select id from shop_listings where shop_id = ${ids.shopId}) and reason = 'csv' order by before_qty`;
    check("10e. 재고 이력: 3 에서 5, 0 에서 2 (csv)", ev.length === 2 && ev.some((e) => e.before_qty === 3 && e.after_qty === 5), JSON.stringify(ev));
  }

  // 11) 직원 초대 — 대표가 만들고, 다른 계정은 못 받고, 초대받은 계정만 합류한다
  const staffPage = `/vendor/${shop.slug}/staff`;
  let invitePath = null;
  {
    const r = await callAction({
      page: staffPage,
      file: "staff/actions",
      name: "inviteStaffAction",
      cookie: ownerCookie,
      args: [shop.slug, null, "$K1"],
      fields: { email: staff.email.toUpperCase(), role: "staff" },
    });
    invitePath = /\/vendor\/invite\/[A-Za-z0-9_-]+/.exec(r.text)?.[0] ?? null;
    const inv = await sql`select email, token_hash from shop_staff_invites where shop_id = ${ids.shopId}`;
    check("11. 초대 링크가 나오고, 이메일은 소문자, 원문 토큰은 DB 에 없다", Boolean(invitePath) && inv[0]?.email === staff.email && !inv[0]?.token_hash.includes(invitePath?.split("/").pop() ?? "x"));
  }
  const token = invitePath?.split("/").pop() ?? "";

  const staffCookie = await signUp(staff);
  ids.staffId = (await sql`select id from users where email = ${staff.email}`)[0]?.id ?? null;
  check("11b. 직원 가입", Boolean(staffCookie && ids.staffId));

  const accept = (cookie) =>
    callAction({ page: invitePath, file: "invite/[token]/actions", name: "acceptInviteAction", cookie, args: [token] });
  {
    const r = await accept(adminCookie);
    const n = (await sql`select count(*)::int as n from shop_staff where shop_id = ${ids.shopId}`)[0].n;
    check("12. 다른 계정은 초대를 못 받는다", n === 1 && r.text.includes("로그인한 계정이 달라요"), `직원 ${n}명`);
  }
  {
    await accept(staffCookie);
    const [m] = await sql`select role from shop_staff where shop_id = ${ids.shopId} and user_id = ${ids.staffId}`;
    const [inv] = await sql`select accepted_at from shop_staff_invites where shop_id = ${ids.shopId}`;
    check("13. 초대받은 계정은 합류한다(staff), 초대는 쓴 것으로", m?.role === "staff" && Boolean(inv?.accepted_at));
    const [u] = await sql`select role from users where id = ${ids.staffId}`;
    check("13b. 전역 역할은 그대로(user)", u?.role === "user", u?.role);
  }
  {
    const r = await accept(staffCookie);
    check("13c. 같은 초대를 두 번 못 쓴다", r.text.includes("이미 사용한 초대"));
  }

  // 14) 직원 권한 — 판매 목록은 열리고, 초대는 못 한다
  {
    const res = await fetch(base + listingsPage, { headers: { cookie: staffCookie }, redirect: "manual" });
    check("14. 직원은 판매 목록을 연다", res.status === 200, `http=${res.status}`);
    await callAction({
      page: staffPage,
      file: "staff/actions",
      name: "inviteStaffAction",
      cookie: staffCookie,
      args: [shop.slug, null, "$K1"],
      fields: { email: `e2e-nobody+${stamp}@example.com`, role: "manager" },
    });
    const n = (await sql`select count(*)::int as n from shop_staff_invites where shop_id = ${ids.shopId}`)[0].n;
    check("14b. 직원은 초대를 못 만든다", n === 1, `초대 ${n}건`);
  }

  // 15) 대표가 직원을 내보낸다. 대표 자신은 못 내보낸다
  {
    const remove = (userId) =>
      callAction({
        page: staffPage,
        file: "staff/actions",
        name: "removeStaffAction",
        cookie: ownerCookie,
        args: [shop.slug, null, "$K1"],
        fields: { userId },
      });
    await remove(ids.ownerId);
    await remove(ids.staffId);
    const rows = await sql`select user_id, role from shop_staff where shop_id = ${ids.shopId}`;
    check("15. 직원은 나가고 대표는 남는다", rows.length === 1 && rows[0].role === "owner", JSON.stringify(rows));
  }
}

async function cleanup() {
  if (keep) return console.log("\n--keep 이라 남긴다:", JSON.stringify(ids));
  if (ids.shopId) {
    await sql`delete from shop_stock_events where listing_id in (select id from shop_listings where shop_id = ${ids.shopId})`;
    await sql`delete from shop_listings where shop_id = ${ids.shopId}`;
    await sql`delete from product_components where product_id in (select id from products where registered_shop_id = ${ids.shopId})`;
    await sql`delete from products where registered_shop_id = ${ids.shopId}`;
    await sql`delete from shop_staff_invites where shop_id = ${ids.shopId}`;
    await sql`delete from shop_staff where shop_id = ${ids.shopId}`;
    await sql`delete from shops where id = ${ids.shopId}`;
  }
  const users = [ids.ownerId, ids.staffId, ids.adminId].filter(Boolean);
  if (users.length > 0) {
    await sql`delete from sessions where user_id = any(${users})`;
    await sql`delete from users where id = any(${users})`;
  }
  const [left] = await sql`select count(*)::int as n from users where email like ${`e2e-%+${stamp}@example.com`}`;
  const [shopsLeft] = await sql`select count(*)::int as n from shops where slug = ${shop.slug}`;
  console.log(`\n정리 완료 — 남은 시험 매장 ${shopsLeft.n}건, 남은 시험 계정 ${left.n}개`);
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
