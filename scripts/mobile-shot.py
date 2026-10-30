# 모바일 폭 화면 점검 — 캡처 + 가로 넘침, 글자 잘림, 짧은 글 두 줄, 16px 미만 입력 칸을 찍는다(2026-10-30 모바일웹 점검).
# 사용: python scripts/mobile-shot.py <폭> <auth|anon> <출력 폴더> /경로1 /경로2 ...
#   Git Bash 에서는 MSYS_NO_PATHCONV=1 을 붙인다(안 붙이면 /경로 가 C:/Program Files/Git/경로 로 바뀐다). 출력은 PYTHONIOENCODING=utf-8.
#   auth 는 저장소 루트의 .auth-state.json(playwright storage_state, 커밋 금지)을 쓴다 — admin-drive.py 계정으로 로그인해 만든다.
#   dev 서버 4000번이 떠 있어야 한다(localhost). 전체 페이지 캡처라 고정 탭바는 화면 높이 자리에 찍힌다.
# 필요한 것: pip install playwright && playwright install chromium
# 긴 캡처를 보기 좋게 묶기: 같은 폴더에 <이름>__tiles 가 생긴다(1100px 씩 잘라 넷을 가로로).
import sys, asyncio, json, pathlib
from playwright.async_api import async_playwright
BASE = "http://localhost:4000"
W = int(sys.argv[1]); MODE = sys.argv[2]; OUT = pathlib.Path(sys.argv[3]); PATHS = sys.argv[4:]
OUT.mkdir(parents=True, exist_ok=True)
STATE = str(pathlib.Path(__file__).resolve().parent.parent / ".auth-state.json")
PROBE = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, scrollW: document.scrollingElement.scrollWidth, over: [], clip: [], small: [], wrap: [] };
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.closest('.sr-only,[aria-hidden=true]')) continue;
    // 가로로 화면 밖(스크롤 상자 안은 제외)
    if ((r.right > vw + 1 || r.left < -1) && !hasScrollAncestor(el)) {
      const k = desc(el); if (!seen.has(k)) { seen.add(k); out.over.push(k + ` [${Math.round(r.left)}..${Math.round(r.right)}]`); }
    }
    // 글자 잘림: 자식 글이 있고 overflow hidden/clip 인데 scrollWidth 가 넘침, 말줄임 아님
    const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (txt && el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis' && !el.closest('[data-clamp]')) {
      out.clip.push(desc(el) + ` "${el.textContent.trim().slice(0,30)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'hidden' && parseFloat(cs.fontSize) < 16) {
      out.small.push(desc(el) + ` font ${cs.fontSize}`);
    }
    // 의심 줄바꿈: 짧은 글(<=12자) 버튼/배지/칩이 두 줄
    if (txt && /^(BUTTON|A|SPAN)$/.test(el.tagName) && el.textContent.trim().length <= 14 && cs.whiteSpace !== 'nowrap') {
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      const range = document.createRange(); range.selectNodeContents(el);
      const lines = new Set([...range.getClientRects()].map(x => Math.round(x.top))).size;
      if (lines > 1) out.wrap.push(desc(el) + ` "${el.textContent.trim()}" ${lines}줄`);
    }
  }
  function hasScrollAncestor(el) {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/auto|scroll|hidden|clip/.test(s.overflowX)) return true;
    }
    return false;
  }
  function desc(el) {
    const c = (el.className && typeof el.className === 'string') ? '.' + el.className.split(/\s+/).slice(0,3).join('.') : '';
    return el.tagName.toLowerCase() + c;
  }
  out.over = out.over.slice(0, 12); out.clip = out.clip.slice(0, 12); out.wrap = out.wrap.slice(0, 20); out.small = out.small.slice(0, 8);
  return out;
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        kw = dict(viewport={"width": W, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True,
                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
        if MODE == "auth": kw["storage_state"] = STATE
        ctx = await b.new_context(**kw)
        pg = await ctx.new_page()
        for path in PATHS:
            name = path.strip("/").replace("/", "_").replace("?", "_").replace("=", "-").replace("&", "_") or "home"
            try:
                resp = await pg.goto(BASE + path, wait_until="networkidle", timeout=60000)
                await pg.wait_for_timeout(900)
                res = await pg.evaluate(PROBE)
                await pg.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
                flag = "OVER" if res["scrollW"] > res["vw"] else "ok"
                print(f"== {path} [{resp.status if resp else '?'}] {flag} scrollW={res['scrollW']} vw={res['vw']} -> {pg.url.replace(BASE,'')}")
                for k in ("over", "clip", "wrap", "small"):
                    for x in res[k]: print(f"   {k}: {x}")
            except Exception as e:
                print(f"== {path} ERR {e}")
        await b.close()
    tile(OUT)

def tile(out, seg=1100, cols=4):
    from PIL import Image
    dst = out / "tiles"; dst.mkdir(exist_ok=True)
    for f in sorted(out.glob("*.png")):
        im = Image.open(f).convert("RGB"); w, h = im.size
        parts = [im.crop((0, y, w, min(y + seg, h))) for y in range(0, h, seg)]
        for s in range(0, len(parts), cols):
            group = parts[s:s + cols]
            sheet = Image.new("RGB", (len(group) * (w + 12), seg), (40, 40, 40))
            for i, p in enumerate(group): sheet.paste(p, (i * (w + 12), 0))
            sheet.save(dst / f"{f.stem[:40]}__{s // cols}.png")

asyncio.run(main())
