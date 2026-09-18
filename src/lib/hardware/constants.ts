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
