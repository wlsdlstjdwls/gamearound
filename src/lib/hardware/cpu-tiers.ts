// CPU 등급표 — GPU 표와 같은 규칙이다(gpu-tiers 의 머리 주석을 먼저 읽는다).
//
// **CPU 는 GPU 보다 훨씬 자주 판정 불가다.** 실측(2026-09-18, 표본 435개 문구):
// 모델명을 아예 안 적은 문구가 훨씬 많다 — "Quad Core Processor", "Dual-Core 2.2 GHz", 그냥 "i5".
// 미매칭 1위가 `i5` 33회, 2위가 `i3` 16회였는데 **둘 다 사전의 구멍이 아니다.**
// i5 는 2009년부터 지금까지 있고 그 사이 성능이 열 배 넘게 벌어졌다 — 한 값으로 접으면
// 어느 쪽으로든 거짓말이 된다. 그래서 세대를 안 적은 문구는 아예 후보로 세우지 않는다(looksLikeModel).
//
// 게임 성능 기준이라 코어 수보다 세대와 단일 코어 성능이 순서를 정한다.

/** 티어 → 그 급의 프로세서 이름들 */
export const CPU_TIERS: Record<number, string[]> = {
  1: ["Pentium 4", "Athlon 64", "Athlon XP", "Celeron N4100"],
  2: ["Core 2 Duo", "Athlon II X2", "Athlon II X2 270", "Pentium Dual Core", "Celeron G1610", "Core i3 530"],
  3: ["Core 2 Quad", "Core 2 Quad Q6600", "Core 2 Quad Q8400", "Athlon II X4", "Phenom II X2", "Celeron G1820", "Pentium G3220", "Core i5 750"],
  4: ["Core i3 2100", "Core i3 3220", "Core i3 3225", "Core i3 3240", "Phenom II X4", "Phenom II X4 965", "FX 4100", "FX 4300", "FX 4350", "Athlon X4 860K", "Pentium G4560"],
  5: ["Core i5 2300", "Core i5 2400", "Core i5 2500", "Core i5 2500K", "Core i3 4130", "Core i3 4160", "FX 6300", "FX 6350", "Phenom II X6"],
  6: ["Core i5 3330", "Core i5 3470", "Core i5 3550", "Core i5 3570K", "Core i5 4430", "Core i5 4460", "Core i3 6100", "Core i3 7100", "FX 8300", "FX 8320", "FX 8350", "Ryzen 3 1200"],
  7: ["Core i5 4570", "Core i5 4590", "Core i5 4670", "Core i5 4670K", "Core i5 4690", "Core i5 4690K", "Core i7 2600K", "Core i7 3770", "Core i5 6400", "Core i5 6500", "FX 8370", "FX 9370", "FX 9590", "Ryzen 3 1300X", "Ryzen 5 1400"],
  8: ["Core i5 6600", "Core i5 6600K", "Core i5 7400", "Core i5 7500", "Core i3 8100", "Core i7 4770", "Core i7 4790K", "Ryzen 5 1500X", "Ryzen 5 1600", "Ryzen 3 2300X", "Ryzen 3 3100"],
  9: ["Core i5 7600K", "Core i5 8400", "Core i5 8500", "Core i7 6700", "Core i7 6700K", "Core i7 7700", "Ryzen 5 1600X", "Ryzen 5 2500X", "Ryzen 5 2600", "Ryzen 7 1700", "Ryzen 3 3300X"],
  10: ["Core i5 8600", "Core i5 8600K", "Core i5 9400", "Core i5 9400F", "Core i5 9600K", "Core i3 10100", "Core i7 7700K", "Core i7 8700", "Ryzen 5 2600X", "Ryzen 5 3500", "Ryzen 5 3600", "Ryzen 7 1800X", "Ryzen 7 2700"],
  11: ["Core i5 10400", "Core i5 10600", "Core i5 10600K", "Core i7 8700K", "Core i7 9700", "Ryzen 5 3600X", "Ryzen 5 5500", "Ryzen 7 2700X", "Ryzen 7 3700X"],
  12: ["Core i5 11400", "Core i5 11500", "Core i5 11600K", "Core i3 12100", "Core i7 9700K", "Core i7 10700", "Core i9 9900K", "Ryzen 5 5600", "Ryzen 5 5600X", "Ryzen 7 3800X", "Ryzen 9 3900X"],
  13: ["Core i5 12400", "Core i5 12600K", "Core i7 10700K", "Core i7 11700", "Core i9 10900K", "Ryzen 7 5700X", "Ryzen 7 5800X", "Ryzen 5 7600"],
  14: ["Core i5 13400", "Core i5 13500", "Core i7 11700K", "Core i7 12700", "Core i9 11900K", "Ryzen 9 5900X", "Ryzen 7 5800X3D", "Ryzen 5 7600X", "Ryzen 5 9600X"],
  15: ["Core i5 13600K", "Core i5 14600K", "Core i7 12700K", "Core i7 13700", "Ryzen 9 5950X", "Ryzen 7 7700", "Ryzen 7 7700X", "Ryzen 7 9700X"],
  16: ["Core i7 13700K", "Core i7 14700K", "Core i9 12900K", "Ryzen 9 7900", "Ryzen 9 7900X", "Ryzen 7 7800X3D", "Ryzen 9 9900X"],
  17: ["Core i9 13900K", "Core i9 14900K", "Core Ultra 7 265K", "Core Ultra 9 285K", "Ryzen 9 7950X", "Ryzen 9 7950X3D", "Ryzen 9 9950X", "Ryzen 7 9800X3D", "Ryzen 9 9950X3D"],
};

/**
 * 모델 이름이 아닌데 프로세서 칸에 흔히 오는 말.
 * 판정에는 안 쓰고, "우리 사전의 구멍" 과 "스토어가 모델을 안 적음" 을 가르는 데만 쓴다.
 */
export const CPU_NON_MODEL_HINTS = [
  "dual core", "dualcore", "dual-core", "quad core", "quadcore", "quad-core", "hexa", "octa", "core processor",
  "ghz", "equivalent", "better", "higher", "compatible", "64 bit", "64bit", "threads", "instruction set", "sse",
];
