// 사양 축의 값들 — 로직 안에 리터럴을 두지 않는다(AGENTS §2).

/**
 * WebGL 렌더러 문자열에 섞여 오는 그래픽 API, 백엔드 이름. 부품을 특정하지 못하는 말들이다.
 *
 * 왜 사전(normalize 의 VENDOR_WORDS)과 따로 두나: 저쪽은 **사람이 적은 사양 문구**에서 걷어 내는 말이고
 * 이쪽은 **드라이버가 붙이는 꼬리표**다. 사양 문구에 "Direct3D11" 이 나오는 일은 없고,
 * 반대로 "graphics card" 가 렌더러 문자열에 나오는 일도 없다. 한 목록으로 합치면
 * 양쪽 다 쓰지 않는 말이 쌓이고, 지울 때 어느 쪽이 쓰던 것인지 알 수 없게 된다.
 */
export const WEBGL_NOISE_WORDS = [
  "Direct3D11", "Direct3D9", "D3D11", "D3D9", "OpenGL Engine", "OpenGL", "Metal", "Vulkan",
  "SwiftShader", "Google Inc.", "Apple Inc.", "Mesa", "ANGLE",
] as const;

/**
 * GPU 없이 CPU 로 그리는 렌더러 이름. 이 말이 렌더러 문자열 어디에든 있으면 부품을 못 읽은 것이다.
 *
 * 잡음 낱말(위)로 걷어 내는 것으로는 모자란다 — 2026-09-25 실측으로 헤드리스 크롬은
 * `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` 를 주고,
 * 겹친 괄호 탓에 파서가 "1.3.0 )" 을 그래픽 이름으로 칸에 채웠다. 가상 PC, 원격 데스크톱,
 * GPU 가속을 끈 브라우저가 같은 꼴(llvmpipe, Microsoft Basic Render Driver)을 준다.
 */
export const SOFTWARE_RENDERER_WORDS = ["SwiftShader", "llvmpipe", "softpipe", "Microsoft Basic Render"] as const;

/**
 * 폼의 제안 목록에 내려보낼 부품 수(빠른 것부터).
 *
 * 사전 전체(300개가 넘는다)를 목록으로 펴지 않는 이유는 화면 무게다. 제안이 없어도 입력은 되고
 * (자유 입력이라 매칭기가 알아본다) 옛 부품을 쓰는 사람은 이름을 정확히 아는 편이다 —
 * 제안이 필요한 쪽은 요즘 부품을 고르는 사람이다.
 *
 * 설정 화면과 상세의 간이 폼이 같은 수를 쓴다(2026-09-22). 두 자리의 제안 목록 길이가 다르면
 * 같은 부품을 한쪽에서만 고를 수 있게 된다.
 */
export const PART_SUGGEST_LIMIT = 80;

/**
 * 메모리 빠른 선택(GB). 숫자를 손으로 치는 대신 누르게 한다 — 이 칸은 사람이 이미 아는 값이고
 * 자주 쓰는 값이 대여섯 개뿐이라 자판을 여는 것 자체가 비용이다(모바일에서 특히).
 * 목록에 없는 값은 옆 칸에 그대로 적는다.
 */
export const RAM_QUICK_GB = [8, 16, 32, 64] as const;
