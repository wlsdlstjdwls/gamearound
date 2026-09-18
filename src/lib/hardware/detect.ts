// 브라우저가 스스로 아는 기기 정보 — 사양 설계 문서 §5 의 "자동 감지".
//
// 사람이 자기 그래픽카드 이름을 정확히 적는 일은 드물다. 브라우저는 그 값을 이미 알고 있다 —
// WebGL 이 렌더러 문자열로 내준다. 적는 칸을 없애지는 않는다(감지가 실패하는 기기가 있다).
// **채워 주고 고칠 수 있게 둔다.**
//
// 안 읽는 값이 둘 있고, 안 읽는 이유가 이 파일의 핵심이다.
// - `navigator.deviceMemory` 는 크롬에서 **8 에서 잘린다.** 32GB 기기가 8 로 온다.
//   그대로 채우면 판정이 "메모리 모자람" 이라고 거짓말을 한다 — 빈칸이 틀린 값보다 낫다.
// - CPU 모델은 브라우저가 아예 모른다. `hardwareConcurrency` 는 코어 수지 모델이 아니다.
//   코어 수로 모델을 되짚는 것은 추측이고, 이 축에서 추측은 "모르면 모른다고 한다" 를 깬다.
import type { OsFamily } from "@/server/db/schema";
import { WEBGL_NOISE_WORDS } from "./constants";

/**
 * WebGL 렌더러 문자열에서 부품 이름만 뽑는다.
 *
 * 크로미움은 ANGLE 을 거쳐 `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)`
 * 처럼 준다 — 괄호 안 가운데 칸이 부품이고 앞뒤는 벤더와 백엔드다.
 * ANGLE 을 안 거치면 `NVIDIA GeForce GTX 1060/PCIe/SSE2`, `AMD Radeon Pro 5500M OpenGL Engine` 처럼 온다.
 *
 * 뽑은 이름은 정규화(normalizeModelKey)를 거쳐 사전을 찾는다 — 사양 문구를 알아보는 그 매칭기와 같다.
 * 그래서 여기서는 **사전이 모르는 잡음만** 걷어 내면 되고, 벤더 이름은 건드리지 않는다.
 */
export function parseWebglRenderer(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim();

  const angle = s.match(/^ANGLE\s*\((.*)\)$/i);
  if (angle) {
    const parts = angle[1].split(",").map((p) => p.trim());
    // 셋이면 가운데(벤더, 부품, 백엔드), 둘이면 뒤(벤더, 부품), 하나면 그것 자체다
    s = parts.length >= 3 ? parts[1] : parts[parts.length - 1];
  }

  // `/PCIe/SSE2` 같은 꼬리, `(0x00001B81)` 같은 장치 ID, 백엔드 이름을 뗀다
  s = s.replace(/\([^)]*\)/g, " ").split("/")[0];
  for (const w of WEBGL_NOISE_WORDS) s = s.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
  s = s.replace(/\bvs_\d(?:_\d)?\b|\bps_\d(?:_\d)?\b/gi, " ").replace(/\s+/g, " ").trim();
  return s || null;
}

/**
 * 사용자 에이전트에서 OS 갈래. 판정은 OS 마다 사양이 달라서 이 값이 틀리면 전부 틀린다.
 *
 * 모르면 null 을 돌려주고 화면은 고른 값을 그대로 둔다 — 못 알아본 OS 를 윈도우로 때려 넣으면
 * 맥 사용자가 자기 기기에 없는 요구선을 본다.
 */
export function osFamilyFromUserAgent(ua: string): OsFamily | null {
  const s = ua.toLowerCase();
  // iOS, 안드로이드는 이 축이 다루는 기기가 아니다 — 먼저 걸러야 "mac" 에 아이폰이 섞이지 않는다
  if (/iphone|ipad|android/.test(s)) return null;
  if (/windows|win32|win64/.test(s)) return "windows";
  if (/mac os|macintosh|darwin/.test(s)) return "mac";
  if (/linux|x11|cros/.test(s)) return "linux";
  return null;
}

/** 감지 결과. 못 읽은 항목은 null 이고 화면은 그 칸을 건드리지 않는다 */
export type DetectedSpec = { gpuName: string | null; osFamily: OsFamily | null };

/**
 * 브라우저에서 실제로 읽는다. 서버에서 부르면 빈 결과다 — 이 값은 기기마다 다르고 캐시될 수 없다.
 *
 * 캔버스를 만들고 바로 버린다. 컨텍스트를 남겨 두면 탭마다 GPU 컨텍스트 하나를 붙잡고 있게 되고,
 * 브라우저는 그 수에 상한이 있어 다른 탭의 WebGL 이 조용히 실패한다.
 */
export function detectSpec(): DetectedSpec {
  if (typeof document === "undefined" || typeof navigator === "undefined") {
    return { gpuName: null, osFamily: null };
  }
  const osFamily = osFamilyFromUserAgent(navigator.userAgent);
  let gpuName: string | null = null;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
  if (gl && "getExtension" in gl) {
    const ctx = gl as WebGLRenderingContext;
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    // 확장이 없으면 UNMASKED 를 못 읽는다(사파리 일부, 지문 방지 설정). 그때는 빈손으로 돌아간다 —
    // 확장 없이 읽히는 RENDERER 는 "WebKit WebGL" 같은 값이라 부품 이름이 아니다
    const raw = ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
    if (typeof raw === "string") gpuName = parseWebglRenderer(raw);
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return { gpuName, osFamily };
}
