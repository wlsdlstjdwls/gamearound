// 추가 콘텐츠의 갈래를 제목으로 **추정**한다. 순수 함수라 서버, 클라이언트 양쪽에서 쓴다.
//
// 왜 필요한가(2026-09-16 실측): 자식 42,011건 중 DLC 로 묶인 것이 34,243건인데,
// 그 안에 코스튬, 외형이 4,895건, 사운드트랙 580건, 재화 208건이 섞여 있다.
// 몬헌 라이즈는 자식이 504건이고 상세 화면 30줄이 전부 "덧입는 장비" 로 찼다 —
// 정작 사람이 찾는 확장팩(SUNBREAK)은 그 아래로 밀려 안 보였다.
//
// **이 값은 정렬에만 쓴다. 화면에 배지로 적지 않는다.**
// 제목 규칙은 다국어 카탈로그에서 반드시 구멍이 난다("Sunbreak" 어디에도 확장팩이라 안 적혀 있다).
// 배지로 적으면 틀린 사실이 박히지만, 정렬로만 쓰면 오탐의 대가가 "순서가 조금 어긋난다" 로 끝난다.
// 스토어가 주는 진짜 종류(Steam type=music, Xbox ProductKind, PS 분류 칸)를 싣게 되면 그때 배지를 단다.

/** 살 만한 것부터 꾸미기, 부록 순. 숫자가 작을수록 위에 선다 */
export type AddonKind = "expansion" | "content" | "unknown" | "cosmetic" | "media" | "currency";

const ORDER: Record<AddonKind, number> = {
  expansion: 0,
  content: 1,
  unknown: 2,
  cosmetic: 3,
  media: 4,
  currency: 5,
};

/**
 * 판정 순서가 곧 우선순위다 — 위에서 걸리면 멈춘다.
 * "확장팩" 이 제일 먼저인 이유: "시즌 패스 코스튬 세트" 처럼 두 낱말이 같이 오면 큰 쪽이 이겨야 한다.
 *
 * 어간만 남긴 것: `덧입`("덧입는 장비" 와 "덧입히기 무기" 가 둘 다 있다 — 활용형을 다 적으면 또 빠뜨린다).
 * 뺀 것들: `gold`(골드 에디션과 부딪힌다), `point`(고유명사에 흔하다), `music`(단독으로는 곡명에 흔하다).
 * 정렬에만 쓰는 값이라 놓치는 쪽을 택한다 — 잘못 내리는 것보다 그냥 두는 것이 싸다.
 *
 * 이 목록은 계속 자란다. 새 낱말을 더할 때는 **그 낱말이 들어간 실제 제목**을 테스트에 같이 남긴다 —
 * 규칙만 늘리면 다음 사람이 왜 그 낱말이 거기 있는지 모른다. 다 잡으려 들지 않는다:
 * 상위 몇 줄이 확장팩으로 서면 목적은 이미 이룬 것이고, 싼 것들 사이의 순서는 눈에 띄지 않는다.
 */
const RULES: [AddonKind, RegExp][] = [
  // 차수가 낀 이름이 흔하다("철권 8 시즌 3 패스", "Season 2 Pass") — 숫자 한 칸을 비워 둔다
  ["expansion", /expansion|season\s*(\d+\s*)?pass|story\s*pack|시즌\s*(\d+\s*)?패스|확장\s*팩|스토리\s*팩|본편\s*\+/i],
  ["media", /soundtrack|sound\s*track|\bost\b|original\s*score|\bbgm\b|art\s*book|artbook|theme\s*song|사운드\s*트랙|아트\s*북|주제가|オリジナルサウンドトラック/i],
  ["currency", /\bcoins?\b|\bgems?\b|credits?\s*pack|currency\s*pack|코인|재화|크리스탈/i],
  [
    "cosmetic",
    /costume|outfit|\bskin\b|hairstyle|face\s*paint|makeup|layered\s*armor|sticker|gesture|\bpose\b|emote|decal|avatar|wallpaper|voice\b|덧입|차림새|의상|코스튬|스킨|헤어|머리\s*모양|메이크업|스티커|스탬프|포즈|제스처|아바타|보이스|음성|외형/i,
  ],
  ["content", /character|chapter|episode|mission|quest|map\s*pack|캐릭터|챕터|에피소드|미션|퀘스트|맵\s*팩|스테이지/i],
];

/** 제목 하나의 갈래. 아무 규칙에도 안 걸리면 unknown 이고, unknown 은 꾸미기보다 위에 선다 */
export function addonKindOf(title: string): AddonKind {
  for (const [kind, re] of RULES) if (re.test(title)) return kind;
  return "unknown";
}

/** 정렬에 쓰는 한 줄 — 제목으로 갈래를, 값으로 무게를 잰다 */
export type SortableAddon = { title: string; price: number | null };

/**
 * 추가 콘텐츠 목록 정렬 비교자.
 *
 * 1) 갈래 2) 비싼 것 3) 제목.
 *
 * **값을 두 번째 열쇠로 쓰는 이유**(2026-09-16 실측): 제목만으로는 확장팩을 못 올린다.
 * "MONSTER HUNTER RISE: SUNBREAK" 어디에도 확장팩이라는 말이 없어 unknown 으로 떨어지고,
 * 그러면 제목순에 밀려 "【헌터 특전】엘가도 이득 패키지(무료)" 아래로 내려간다.
 * 값은 스토어가 직접 매긴 무게다 — 확장팩 6,720원, 덧입는 장비 1,900원, 특전 0원.
 * 통화가 섞인 줄끼리 비교하면 숫자가 어긋날 수 있지만(원 대 달러), 정렬에만 쓰므로 그대로 둔다.
 *
 * 값이 같거나 둘 다 없으면 제목순이다 — 같은 자리에서까지 순서가 흔들리면
 * 새로고침마다 목록이 바뀐 것처럼 보인다.
 */
export function byAddonKind(a: SortableAddon, b: SortableAddon): number {
  const kind = ORDER[addonKindOf(a.title)] - ORDER[addonKindOf(b.title)];
  if (kind !== 0) return kind;
  // 값을 모르는 줄은 맨 아래다. 수집이 안 됐다는 뜻이라 "무료" 와 섞으면 둘 다 잘못 읽힌다
  const pa = a.price ?? -1;
  const pb = b.price ?? -1;
  if (pa !== pb) return pb - pa;
  return a.title.localeCompare(b.title, "ko");
}
