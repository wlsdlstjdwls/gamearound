// 부품 이름 정규화 — "GTX 1060", "NVIDIA® GeForce® GTX1060 6GB", "nVidia GTX-1060" 을 같은 열쇠로 만든다.
//
// 왜 필요한가: 사양 문구는 개발사가 손으로 적은 글이다. 같은 카드를 부르는 방법이 스무 가지쯤 된다.
// 제목 검색에서 쓰는 정규화(games.title_en_norm)와 같은 발상이고, 여기서는 제조사 이름과
// 상표 기호까지 걷어 낸다 — "GeForce" 가 붙었는지 여부로 다른 부품이 되면 안 된다.
//
// 열쇠를 사람이 읽을 필요는 없다. 화면에는 원문을 그대로 보여 주고, 이 값은 사전을 찾을 때만 쓴다.

/**
 * 열쇠에서 지우는 제조사, 계열 표기. 이것들만으로는 부품을 특정하지 못한다.
 *
 * "intel" 을 지우면서도 "hd", "uhd", "iris", "arc" 는 남기는 이유: 인텔 내장 그래픽은
 * 그 단어가 곧 모델 계열이다("HD 520" 과 "UHD 630" 은 다른 물건이다).
 *
 * "core" 도 지운다: 스토어 문구는 "i7-8700K" 처럼 빼고 적는 쪽이 더 흔한데 사전에는 정식 이름
 * ("Core i7 8700K")으로 적혀 있어 한쪽만 길어진다. 양쪽에서 함께 지우면 같은 열쇠가 된다 —
 * "Core 2 Duo" 도 양쪽이 같이 `2duo` 가 되므로 어긋나지 않는다.
 */
const VENDOR_WORDS = [
  "nvidia", "geforce", "amd", "radeon", "ati", "intel", "processor", "cpu", "gpu",
  "graphics card", "video card", "series", "core", "或者", "或",
];

/** 상표 기호와 장식. 값에 아무 뜻도 더하지 않는다 */
const SYMBOLS = /[®™©]/g;

/**
 * 약칭 펴기. 사양 문구는 줄여 적는 일이 잦다 — 실측에 "AMD r5 3600" 이 있었다.
 * 숫자 네 자리가 뒤따를 때만 편다: "r5" 만으로는 라이젠 5 인지 라데온 R5 인지 알 수 없다.
 */
const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\br([3579])\s*-?\s*(\d{4})\b/g, "ryzen$1 $2"],
];

/**
 * 부품 이름 → 사전 열쇠. 소문자 + 영숫자만 남긴다.
 * "GTX 1060" 과 "gtx-1060" 과 "GTX1060" 이 모두 `gtx1060` 이 된다.
 */
export function normalizeModelKey(raw: string): string {
  let s = raw.toLowerCase().replace(SYMBOLS, " ");
  for (const [re, to] of ABBREVIATIONS) s = s.replace(re, to);
  for (const w of VENDOR_WORDS) s = s.replaceAll(w, " ");
  return s.replace(/[^a-z0-9]/g, "");
}

/**
 * 모델 이름에 붙어 온 사양 꼬리표를 떼어 낸다 — 괄호 묶음, 용량, 동작 속도.
 *
 * 왜 필요한가: 꼬리표가 붙으면 열쇠가 `gtx7702gb` 가 되고, 사전의 `gtx770` 뒤에 숫자 2 가
 * 이어져 "다른 모델의 앞부분" 으로 걸러진다(findModel 의 경계 규칙). 2026-09-18 실측에서
 * 이 한 가지가 티어를 못 붙인 후보의 절반이었다.
 *
 * 떼기 전 이름으로 **먼저** 찾아본다 — "GTX 1060 3GB" 와 "GTX 1060 6GB" 는 사전에 따로 있는
 * 다른 티어다. 꼬리표를 먼저 떼면 그 구분이 사라진다.
 */
export function stripSpecNoise(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+(?:\.\d+)?\s*(?:gb|mb|ghz|mhz)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 한 문구에서 후보를 가른다 — "GTX 1060 3GB or AMD RX 580 4GB" 는 부품 **둘**이다.
 *
 * 왜 나누나: 판정은 "후보 중 하나만 넘으면 충족" 이다(설계 §2).
 * 인텔 쓰는 사람에게 라이젠 기준을 들이대면 안 되는데, 한 칸으로 두면 그 일이 일어난다.
 *
 * 쉼표는 조건부로만 구분자다: 실측 문구에 "GTX960,4GB" 처럼 쉼표로 VRAM 을 잇는 표기가 있어서
 * 쉼표 뒤에 부품 이름이 시작될 때만 자른다. 그 밖에는 슬래시, 파이프, "or",
 * 그리고 중국어 "或"(실측에 나온다)로 자른다.
 */
const SEPARATORS = /\s*(?:\/|\||、|,\s*(?=(?:nvidia|amd|intel|geforce|radeon|gtx|rtx|rx|ryzen|core|i[3579]\b))|\bor\b|或者|或)\s*/gi;

export function splitCandidates(text: string): string[] {
  return text
    .split(SEPARATORS)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 후보 문구에 딸려 온 비디오 메모리. "(4 GB)", "8GB VRAM", "3 GB" 를 MB 로.
 *
 * 이 값은 **그 후보 카드의 사양**이지 게임이 요구하는 VRAM 이 아니다 —
 * 그래서 사양 행(game_requirements.vram_mb)이 아니라 후보 행에 남긴다.
 */
export function extractVramMb(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(gb|mb)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(m[2].toLowerCase() === "gb" ? n * 1024 : n);
}
