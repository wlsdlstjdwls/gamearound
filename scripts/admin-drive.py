# 관리자 화면 몰기 — 로그인, 클릭, 입력, 상태줄 읽기, 캡처를 단계 인자로 한 줄에 돌린다(2026-10-30).
# 사용: python scripts/admin-drive.py OUT.png /admin/<화면> [단계...]   (dev 서버 4000번이 떠 있어야 한다, localhost 로 연다)
#
# 계정은 .env.local 의 CLAUDE_ADMIN_EMAIL / CLAUDE_ADMIN_PASSWORD — Claude 작업용 관리자다. 값은 Vercel development 환경에도
# 들어 있어 다른 PC 에서는 `vercel env pull` 로 받는다. 이 파일에 값을 적지 않는다(저장소에 비밀번호를 남기지 않는다).
# 필요한 것: pip install playwright && playwright install chromium (파이썬 쪽이다 — 저장소 의존성에 넣지 않았다)
#
# **로컬 DB 가 곧 운영이다.** 저장 단계를 넣으면 운영에 행이 생긴다. 시험 값에는 [테스트MMDD] 같은 표식을 붙인다.
#
# 단계:
#   btn:<이름>        이름이 정확히 같은 첫 단추(툴바 단추는 글자 그대로: 조회, 입력, 저장 ...)
#   confirm:<이름>    확인 팝업(alertdialog) 안 단추
#   tab:<이름>        탭
#   rowclick:<n>      그리드 n번째 줄(0부터)    check:<n>  그 줄의 체크 칸
#   pick:<단추 이름>=<보기 이름>    pickn:<단추 이름>=<보기 순번>   고르기 칸
#   fill:<css>=<글>   입력 칸 채우기(css 에 = 가 있어도 된다, 마지막 = 로 가른다)
#   focus:<css>       칸에 포커스만 넣는다(값은 안 바꾼다 — 미리 보기 자리 강조 확인)
#   clicktext:<글>    그 글자를 누른다(체크 칸 이름표 등)
#   key:<키>          키 누르기(Control+s, F8 ...)
#   status            6초 기다린 뒤 상태줄 글을 찍는다
#   wait:<ms>  shot:<파일>  text:<정규식>(본문에 있나 찍는다)
import sys, asyncio, re, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent  # 저장소 루트(.env.local 자리)
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
BASE = "http://localhost:4000"
OUT, PATH = sys.argv[1], sys.argv[2]
STEPS = sys.argv[3:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        pg = await ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(BASE + "/sign-in?next=" + PATH, wait_until="networkidle", timeout=120000)
        await pg.fill('input[name="email"]', env["CLAUDE_ADMIN_EMAIL"])
        await pg.fill('input[name="password"]', env["CLAUDE_ADMIN_PASSWORD"])
        await pg.click('button[type="submit"]')
        await pg.wait_for_url("**" + PATH.split("?")[0] + "**", timeout=120000)
        # 상태줄은 모든 관리자 화면에 붙어 있다(그리드 없는 대시보드도). 그리드가 있으면 그것까지 기다린다
        await pg.wait_for_selector('[role="status"]', state="attached", timeout=180000)
        try:
            await pg.wait_for_selector("[data-grid-head]", timeout=15000)
        except Exception:
            pass
        await pg.wait_for_timeout(2000)
        for s in STEPS:
            if s.startswith("btn:"):
                await pg.get_by_role("button", name=s[4:], exact=True).first.click(); await pg.wait_for_timeout(1200)
            elif s.startswith("confirm:"):
                await pg.get_by_role("alertdialog").get_by_role("button", name=s[8:], exact=True).click(); await pg.wait_for_timeout(1200)
            elif s.startswith("tab:"):
                await pg.get_by_role("tab", name=s[4:]).first.click(); await pg.wait_for_timeout(1200)
            elif s.startswith("rowclick:"):
                await pg.locator("[data-grid-row]").nth(int(s[9:])).click(); await pg.wait_for_timeout(800)
            elif s.startswith("check:"):
                await pg.locator("[data-grid-row]").nth(int(s[6:])).get_by_role("checkbox").click(); await pg.wait_for_timeout(500)
            elif s.startswith("pickn:"):
                label, n = s[6:].rsplit("=", 1)
                await pg.get_by_role("button", name=label).first.click(); await pg.wait_for_timeout(400)
                await pg.get_by_role("option").nth(int(n)).click(); await pg.wait_for_timeout(600)
            elif s.startswith("pick:"):
                label, opt = s[5:].split("=", 1)
                await pg.get_by_role("button", name=label).first.click(); await pg.wait_for_timeout(400)
                await pg.get_by_role("option", name=opt, exact=True).first.click(); await pg.wait_for_timeout(600)
            elif s.startswith("fill:"):
                sel, text = s[5:].rsplit("=", 1)
                await pg.fill(sel, text); await pg.wait_for_timeout(400)
            elif s.startswith("focus:"):
                await pg.focus(s[6:]); await pg.wait_for_timeout(700)
            elif s.startswith("key:"):
                await pg.keyboard.press(s[4:]); await pg.wait_for_timeout(1200)
            elif s.startswith("clicktext:"):
                await pg.get_by_text(s[10:], exact=True).first.click(); await pg.wait_for_timeout(500)
            elif s.startswith("wait:"):
                await pg.wait_for_timeout(int(s[5:]))
            elif s == "status":
                await pg.wait_for_timeout(6000)
                print("status:", (await pg.get_by_role("status").first.inner_text()).replace("\n", " "))
            elif s.startswith("shot:"):
                await pg.screenshot(path=s[5:])
            elif s.startswith("text:"):
                body = await pg.inner_text("main") if await pg.locator("main").count() else await pg.inner_text("body")
                print("text:", s[5:], "->", bool(re.search(s[5:], body)))
        await pg.screenshot(path=OUT)
        if errs: print("console errors:", errs[:5])
        await b.close()
asyncio.run(main())


