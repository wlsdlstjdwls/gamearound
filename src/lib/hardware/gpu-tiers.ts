// GPU 등급표 — 설계 문서 §3 의 갈래 (a) "자체 티어표를 손으로 만든다".
//
// **왜 벤치마크 점수를 안 쓰나**: PassMark, 3DMark 같은 점수는 상업적 재배포에 제한이 있다.
// 확인 없이 긁어 쓰지 않는다. 대신 필요한 것은 절대 수치가 아니라 **순서**다 —
// "이 게임 권장이 티어 12, 당신 카드가 티어 14" 면 답이 나온다.
//
// **이 표의 정확도**: 같은 티어 안의 카드들은 서로 비슷한 급이라는 뜻이지 성능이 같다는 뜻이 아니다.
// 세대와 계열로 세운 순서라 인접 티어끼리는 게임에 따라 뒤집힐 수 있다. 그래서 판정은
// 티어가 **같거나 높으면 충족**으로 보고, 아슬아슬한 차이를 단정하지 않는다.
//
// **없는 부품은 지어내지 않는다.** 여기 없는 이름은 "확인 못 한 부품" 으로 남고 판정에서 빠진다.
// 조용히 통과시키는 것이 제일 나쁘다(설계 §6).
//
// **채우는 방법**: 수집한 사양 문구에서 티어를 못 붙인 이름을 빈도순으로 뽑아 위에서부터 넣는다.
// 2026-09-18 에 그렇게 한 바퀴 돌려 커버리지를 70%에서 올렸다. 추측으로 이름을 늘리지 않는다 —
// 실제로 사양 문구에 나온 카드만 넣는다.
//
// 티어를 더할 때: 새 세대가 나오면 위쪽에 티어를 늘리지 말고 기존 티어에 이름을 넣는다.
// 20 은 "지금 살 수 있는 제일 빠른 것" 자리라 세대가 바뀌면 그 자리의 이름이 바뀐다.

/** 티어 → 그 급의 카드 이름들. 이름은 normalizeModelKey 로 열쇠가 된다(제조사 표기는 알아서 걷힌다) */
export const GPU_TIERS: Record<number, string[]> = {
  // 1~2: DirectX 9~10 시절. 지금 게임은 대부분 최소 사양에도 못 미친다
  1: ["GeForce 6800", "GeForce 7300", "GeForce 7600", "Radeon X1300", "Radeon X1600", "Radeon X1950", "Celeron N4100"],
  2: [
    "GeForce 8500", "GeForce 8600 GT", "GeForce 8800 GT", "GeForce 9600 GT", "GeForce 9600 GS", "GeForce GT 730", "GeForce 820M",
    "Radeon HD 2400", "Radeon HD 3650", "Radeon HD 4650", "Intel HD Graphics", "Intel HD Graphics 2000", "Intel HD Graphics 3000",
  ],
  3: [
    "GeForce GT 220", "GeForce GTS 250", "GeForce GT 430", "GeForce GT 1030", "GeForce 9800 GTX",
    "Radeon HD 5670", "Radeon HD 4850", "Radeon HD 7570", "Intel HD Graphics 4000", "HD 4000",
    "Intel HD Graphics 4400", "Intel HD Graphics 4600", "HD 4600", "Intel HD Graphics 5100",
  ],
  4: [
    "GeForce GTX 460", "GeForce GTX 550 Ti", "GeForce GT 640", "GeForce GTX 650",
    "Radeon HD 5770", "Radeon HD 6870", "Radeon R7 250", "Radeon RX 6400",
    "Intel HD Graphics 520", "Intel HD Graphics 530", "Intel HD Graphics 620", "Intel HD Graphics 630", "HD 630",
    "Intel UHD Graphics 620", "Intel UHD Graphics 630", "UHD 630", "Intel Iris 650", "Radeon Vega 8",
  ],
  5: [
    "GeForce GTX 470", "GeForce GTX 560", "GeForce GTX 650 Ti", "GeForce GTX 750", "GeForce GTX 750 Ti",
    "Radeon HD 5850", "Radeon HD 6850", "Radeon HD 7750", "Radeon HD 7770", "Radeon R7 260X", "Radeon RX 550",
    "Intel Iris Xe Graphics", "Radeon Vega 11",
  ],
  6: [
    "GeForce GTX 660", "GeForce GTX 760", "GeForce GTX 950", "GeForce GTX 1630",
    "Radeon HD 7850", "Radeon HD 7870", "Radeon HD 7950", "Radeon R9 270", "Radeon R9 270X",
    "Radeon R7 360", "Radeon R7 370", "Radeon R9 370",
  ],
  7: [
    "GeForce GTX 670", "GeForce GTX 680", "GeForce GTX 770", "GeForce GTX 960", "GeForce GTX 1050",
    "Radeon HD 7970", "Radeon R9 280", "Radeon R9 280X", "Radeon R9 380", "Radeon RX 460", "Radeon RX 560",
    "Intel Arc A380",
  ],
  8: [
    "GeForce GTX 780", "GeForce GTX 970", "GeForce GTX 1050 Ti",
    "Radeon R9 290", "Radeon R9 380X", "Radeon R9 390", "Radeon RX 470", "Radeon RX 570",
  ],
  9: [
    "GeForce GTX 780 Ti", "GeForce GTX 980", "GeForce GTX 1060 3GB",
    "Radeon R9 390X", "Radeon R9 Fury", "Radeon RX 480", "Radeon RX 580",
  ],
  10: ["GeForce GTX 980 Ti", "GeForce GTX 1060", "GeForce GTX 1060 6GB", "GeForce GTX 1650", "Radeon RX 590", "Radeon RX 5500", "Radeon RX 6500 XT"],
  11: [
    "GeForce GTX 1070", "GeForce GTX 1650 Super", "GeForce GTX 1660", "GeForce RTX 3050",
    "Radeon RX 5500 XT", "Radeon RX 5600", "Radeon RX Vega 56", "Intel Arc A580", "Intel Arc A750",
  ],
  12: [
    "GeForce GTX 1070 Ti", "GeForce GTX 1080", "GeForce GTX 1660 Super", "GeForce GTX 1660 Ti",
    "GeForce RTX 2060", "GTX 2060", "Radeon RX Vega 64", "Radeon RX 5600 XT", "Radeon RX 6600", "Intel Arc A770",
  ],
  13: ["GeForce GTX 1080 Ti", "GeForce RTX 2060 Super", "GeForce RTX 2070", "GeForce RTX 3060", "Radeon RX 5700", "Radeon RX 6600 XT", "Radeon RX 7600"],
  14: ["GeForce RTX 2070 Super", "GeForce RTX 2080", "GeForce RTX 3060 Ti", "GeForce RTX 4060", "Radeon RX 5700 XT", "Radeon RX 6650 XT", "Radeon RX 6700"],
  15: ["GeForce RTX 2080 Super", "GeForce RTX 2080 Ti", "GeForce RTX 3070", "GeForce RTX 4060 Ti", "Radeon RX 6700 XT", "Radeon RX 7600 XT", "Intel Arc B580"],
  16: ["GeForce RTX 3070 Ti", "GeForce RTX 3080", "GeForce RTX 4070", "GeForce RTX 5060 Ti", "Radeon RX 6750 XT", "Radeon RX 6800", "Radeon RX 7700 XT"],
  17: ["GeForce RTX 3080 Ti", "GeForce RTX 3090", "GeForce RTX 4070 Super", "GeForce RTX 5070", "Radeon RX 6800 XT", "Radeon RX 6900 XT", "Radeon RX 7800 XT"],
  18: ["GeForce RTX 3090 Ti", "GeForce RTX 4070 Ti", "GeForce RTX 4070 Ti Super", "GeForce RTX 5070 Ti", "Radeon RX 6950 XT", "Radeon RX 7900 GRE", "Radeon RX 7900 XT", "Radeon RX 9070"],
  19: ["GeForce RTX 4080", "GeForce RTX 4080 Super", "GeForce RTX 5080", "Radeon RX 7900 XTX", "Radeon RX 9070 XT"],
  20: ["GeForce RTX 4090", "GeForce RTX 5090"],
};

/**
 * 모델 이름은 아닌데 그래픽 칸에 흔히 오는 말. 실측 341개 문구 중 70개(21%)가 이런 문구뿐이었다.
 *
 * 이 목록은 판정에 쓰지 않는다 — 화면이 "확인 못 한 부품" 과 "애초에 부품을 안 적은 사양" 을
 * 가르는 데만 쓴다. 후자는 우리 사전의 구멍이 아니라 스토어에 값이 없는 것이다.
 */
export const GPU_NON_MODEL_HINTS = [
  "directx", "opengl", "shader", "vram", "compatible", "compatble", "capable",
  "integrated", "onboard", "dedicated", "equivalent", "better", "video memory", "colour", "color",
];
