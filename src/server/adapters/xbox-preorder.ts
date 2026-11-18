// Xbox 스토어 예약 특전 읽기 — 상품 긴 소개(ProductDescription) 머리에 적힌 특전 목록을 사실로 옮기는 순수 함수들.
//
// 왜 소개글을 읽나(2026-11-18 실측): displaycatalog 에는 특전 전용 칸이 없다. 퍼블리셔가 긴 소개 맨 위에
// "[예약 특전]", "사전 주문 특전:" 같은 머리말과 "-", "・" 항목으로 적어 둔다. 어댑터가 이미 받는 같은 응답이다.
//
// 머리말 모양이 퍼블리셔마다 다르다(실측 한국 예약 상품 40건):
//   [예약 특전] / 【조기 구매 특전: 세트 이름】 / ■예약 구매 특전 / 사전 주문 특전: / 예약 구매 특전(그 줄만) /
//   2026년 11월 19일 23:59:59 이전에 구입 시 획득: / 투칸 얼리 예약 보너스: 한 문장(항목이 문장 안에 있다)
// 머리말 없이 홍보 문장으로만 적은 상품(Fable, 메트로 2039 등)은 읽지 않는다 — 문장에서 물건 이름을 어림하면 틀린다.
//
// 무엇을 옮기나: 특전 이름, 묶음 구성, 마감일만. 소개 문장, ※ 안내문은 옮기지 않는다(schema-preorder 머리 주석과 같은 원칙).
// 예외는 머리말 뒤에 항목을 한 문장으로 적은 경우다 — 그 문장이 곧 특전 내용이라 한 줄로 둔다(사용자 지시 2026-11-18).
// 네트워크, DB 를 모른다. 받아 오기는 xbox.ts 의 fetchXboxDescriptions, 반영은 sync/xbox-preorder-bonuses 가 한다.
import { z } from "zod";

/**
 * 첫 머리말을 찾을 때 볼 앞 줄 수(빈 줄 제외). 특전은 소개 맨 위에 온다 — 실측에서 머리말 앞에 온 줄은 많아야 둘이었다
 * ("지금 바로 예약 구매하세요!", "■예약 구매 가격" + 설명 한 줄). 더 깊이 보면 본문 중간의 에디션 구성 "…특전" 을 잡는다.
 */
export const XBOX_BONUS_HEAD_LINES = 5;
/** 항목 하나의 최대 글자 수. 이보다 길면 항목이 아니라 문단으로 본다. 문장형 항목(트로피코 7, 120자 남짓)에 여유를 뒀다 */
export const XBOX_BONUS_ITEM_MAX = 200;
/** 머리말 글자 수 상한. "2026년 11월 19일 23:59:59 이전에 구입 시 획득" 이 가장 길었다(32자) */
const HEADING_MAX = 60;

/** 머리말로 볼 말. "획득", "받으세요" 는 GTA VI, 프리스타일 풋볼 2 처럼 날짜나 문장으로 시작하는 머리말을 받으려고 넣었다 */
const HEADING_WORD = /특전|보너스|구입 시 획득|구매 시 획득|받으세요/;
/** 괄호 머리말 [ … ] 【 … 】 */
const BRACKET_LINE = /^[[【](.+)[\]】]$/;
/** ■ 로 시작하는 줄. 특전 말이 있으면 머리말, 없으면 묶음 안에서는 항목이다(건담 로그 오비트의 "■선행 개방 기체 컬러") */
const SQUARE_MARK = /^■\s*/;
/** 항목 표시. "*" 는 넣지 않는다 — 페르소나4 리바이벌이 "*예약 구매 특전은 …까지" 처럼 안내문 표시로 쓴다 */
const BULLET = /^[-・•▼]\s*/;
/** 안내문 줄. 옮기지 않지만 마감일은 여기서 가장 자주 읽힌다 */
const NOTE = /^[※*]/;
/** 「…」 만 있는 줄은 항목이다(로맨싱 사가 3 의 「72시간 얼리 액세스권」) */
const QUOTED_ONLY = /^「([^」]+)」$/;
/** 글 사이 구분선. 여기서 특전 마디가 끝난다 */
const SEPARATOR = /^[-*=_]{5,}$/;
/**
 * 마감일. "2026년 12월 23일까지", "2027/4/7 23:59까지", "2027년 2월 15일(월) 23:59까지", "2026년 11월 19일 23:59:59 이전에".
 * 날짜와 "까지/이전" 사이에 요일, 시각, (KST) 가 끼어 온다 — 그 틈을 20자로 막아 다른 문장의 "까지" 를 잇지 않게 한다.
 */
const DEADLINE = /(\d{4})\s*[년/.]\s*(\d{1,2})\s*[월/.]\s*(\d{1,2})\s*일?[^\n]{0,20}?(?:까지|이전)/;
/**
 * 파서 판(preorder_bonus_posts.parse_version). 규칙을 고치면 올린다 — 회차마다 다시 읽으므로 옛 판 글도 다음 회차에 고쳐지지만,
 * 어느 판이 만든 줄인지 관리자 화면과 DB 에서 가를 수 있게 남긴다.
 * 1: 2026-11-18 첫 판(괄호, ■, 콜론, 줄 끝 "특전" 머리말 + -, ・, •, ▼, 「」 항목, 까지/이전 마감일)
 */
export const XBOX_PREORDER_PARSE_VERSION = 1;
/** 머리말이 특전 이름 없이 날짜나 문장일 때(GTA VI, 프리스타일 풋볼 2) 화면에 붙일 이름 */
export const XBOX_BONUS_DEFAULT_LABEL = "예약 특전";

export type XboxBonusGroup = {
  /** 머리말("예약 특전", "조기 구매 특전") */
  label: string;
  /** 머리말이 세트 이름을 품었을 때("조기 구매 특전: 모험 스타트 대시 세트" 의 뒤쪽). 그때 items 는 그 세트의 구성이다 */
  setName: string | null;
  items: string[];
  /** YYYY-MM-DD */
  endsOn: string | null;
};

export type XboxPreorderBonus = { groups: XboxBonusGroup[] };

type Heading = { label: string; setName: string | null; inline: string | null };

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** 머리말 이름 다듬기. 특전 말이 없는 머리말(날짜, 문장)은 기본 이름으로 바꾼다 — 날짜는 마감일 칸이 따로 말한다 */
function labelOf(raw: string): string {
  const s = clean(raw.replace(/[:：]\s*$/, ""));
  return /특전|보너스/.test(s) ? s : XBOX_BONUS_DEFAULT_LABEL;
}

/** 이 줄이 특전 머리말이면 그 뜻. 항목 표시로 시작하는 줄은 머리말이 아니다(에디션 구성의 "・마스터즈판 구매 특전 「…」") */
export function readHeading(line: string): Heading | null {
  if (BULLET.test(line) || NOTE.test(line) || line.length > XBOX_BONUS_ITEM_MAX) return null;
  const bracket = BRACKET_LINE.exec(line);
  if (bracket) {
    const inner = bracket[1];
    if (!/특전|보너스/.test(inner)) return null;
    // "조기 구매 특전: 모험 스타트 대시 세트" — 콜론 뒤가 세트 이름이다
    const [head, ...rest] = inner.split(/[:：]/);
    const setName = clean(rest.join(":"));
    return { label: labelOf(head), setName: setName || null, inline: null };
  }
  const body = line.replace(SQUARE_MARK, "");
  // 줄 끝 콜론 머리말: "사전 주문 특전:", "… 이전에 구입 시 획득:", "사전예약 시 아래 디지털 콘텐츠를 받으세요:"
  const colonEnd = /^(.+?)\s*[:：]$/.exec(body);
  if (colonEnd && colonEnd[1].length <= HEADING_MAX && HEADING_WORD.test(colonEnd[1])) return { label: labelOf(colonEnd[1]), setName: null, inline: null };
  // 그 줄만 있는 머리말: "■예약 구매 특전", "예약 구매 특전"(페르소나4 리바이벌). 문장(마침표로 끝남)은 아니다
  if (body.length <= HEADING_MAX && /(특전|보너스)$/.test(body)) return { label: labelOf(body), setName: null, inline: null };
  // 머리말 뒤에 내용을 한 문장으로 적은 줄: "투칸 얼리 예약 보너스: … 받으실 수 있습니다."
  const inline = /^([^:：]{1,40}(?:특전|보너스))\s*[:：]\s*(\S.*)$/.exec(body);
  if (inline) return { label: labelOf(inline[1]), setName: null, inline: clean(inline[2]) };
  return null;
}

function deadlineOf(line: string): string | null {
  const m = DEADLINE.exec(line);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * 묶음 안의 한 줄이 항목이면 그 이름. ■ 줄은 빈 줄 없이 바로 이어질 때만 항목이다 — 빈 줄 뒤의 ■ 는
 * 본문 소제목("■ 공중을 자유자재로 누비며 …")인 경우가 많다(진격의 거인 3 실측).
 */
function itemOf(line: string, afterBlank: boolean): string | null {
  const square = !afterBlank && SQUARE_MARK.test(line);
  if (!BULLET.test(line) && !square && !QUOTED_ONLY.test(line)) return null;
  const body = clean(line.replace(BULLET, "").replace(SQUARE_MARK, ""));
  const s = QUOTED_ONLY.exec(body)?.[1] ?? body;
  return s && s.length <= XBOX_BONUS_ITEM_MAX ? s : null;
}

/**
 * 긴 소개 → 특전 묶음들. 특전이 없으면 null.
 *
 * 묶음이 끝나는 곳: 다음 머리말(새 묶음), 구분선, 또는 **빈 줄 뒤에 항목도 안내문도 머리말도 아닌 줄**(본문 소개가 시작됨).
 * 빈 줄만으로 끊지 않는 이유: 로맨싱 사가 3 은 항목 사이에 빈 줄과 설명 줄을 끼우고, GTA VI 는 머리말과 항목 사이에 빈 줄이 있다.
 * 묶음 안의 【구성】 같은 괄호 소제목은 아직 항목이 없을 때만 넘긴다 — 건담 로그 오비트는 특전 뒤 빈 줄 다음
 * 【세트 내용】 으로 에디션 구성이 이어지는데, 그걸 특전으로 읽으면 안 된다.
 */
export function parseXboxPreorderBonus(description: string | null | undefined): XboxPreorderBonus | null {
  if (!description) return null;
  const lines = description.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const groups: XboxBonusGroup[] = [];
  let current: XboxBonusGroup | null = null;
  let afterBlank = false;
  let nonBlankSeen = 0;

  for (const line of lines) {
    if (!line) {
      afterBlank = true;
      continue;
    }
    if (SEPARATOR.test(line)) break;
    const heading = readHeading(line);
    if (!current) {
      // 첫 머리말은 맨 위 몇 줄 안에서만 찾는다(XBOX_BONUS_HEAD_LINES 주석)
      if (nonBlankSeen++ >= XBOX_BONUS_HEAD_LINES) break;
      if (!heading) continue;
    }
    if (heading) {
      current = { label: heading.label, setName: heading.setName, items: heading.inline ? [heading.inline] : [], endsOn: deadlineOf(line) };
      groups.push(current);
      afterBlank = false;
      continue;
    }
    if (!current) continue;
    // 항목이 이미 있는 묶음 뒤의 괄호 소제목은 에디션 구성이다 — 여기서 특전이 끝난다
    if (BRACKET_LINE.test(line) && current.items.length > 0) break;
    const item = itemOf(line, afterBlank);
    const note = NOTE.test(line);
    const subHeading = BRACKET_LINE.test(line);
    if (afterBlank && !item && !note && !subHeading) break;
    afterBlank = false;
    current.endsOn ??= deadlineOf(line);
    if (item) current.items.push(item);
  }

  const kept = groups.filter((g) => g.items.length > 0 || g.setName);
  return kept.length > 0 ? { groups: kept } : null;
}

/** 저장할 특전 한 줄(preorder_bonuses 의 사실 칸만). 받는 곳은 늘 Xbox 스토어라 비운다 */
export type XboxBonusRow = { name: string; notes: string[]; endsOn: string | null };

/**
 * 묶음 → 특전 줄. 세트 이름이 있으면 세트 하나가 특전 하나이고 구성은 안내 줄로 붙는다.
 * 없으면 항목마다 특전 하나이고, 어느 묶음(예약, 조기 구매)의 것인지를 안내 줄로 붙인다.
 * 같은 이름이 두 묶음에 나오면 앞의 것만 둔다 — 화면 목록의 열쇠가 이름이다.
 */
export function xboxBonusRows(bonus: XboxPreorderBonus): XboxBonusRow[] {
  const out: XboxBonusRow[] = [];
  const seen = new Set<string>();
  const push = (row: XboxBonusRow) => {
    if (seen.has(row.name)) return;
    seen.add(row.name);
    out.push(row);
  };
  for (const g of bonus.groups) {
    if (g.setName) push({ name: g.setName, notes: [g.label, ...g.items], endsOn: g.endsOn });
    else for (const item of g.items) push({ name: item, notes: [g.label], endsOn: g.endsOn });
  }
  return out;
}

/** 소개를 읽어 온 상품 하나 */
export type XboxDescription = { productId: string; title: string | null; description: string | null };

/** 소개만 읽는 최소 스키마. 상품 전체 스키마(xbox.ts)를 태우면 가격 칸 하나의 변덕에 특전까지 같이 죽는다 */
const descriptionEnvelope = z.object({
  Products: z
    .array(
      z.object({
        ProductId: z.string(),
        LocalizedProperties: z
          .array(z.object({ ProductTitle: z.string().nullish(), ProductDescription: z.string().nullish() }))
          .nullish(),
      }),
    )
    .default([]),
});

/**
 * products?bigIds 응답 → 상품별 소개. 응답에 없는 ID 는 결과에 없다 — 부르는 쪽이 "모름" 으로 다뤄 지우지 않는다.
 * 열쇠는 대문자 ProductId 다(우리가 든 ID 가 소문자일 수 있다 — xbox.ts 의 pickRawProduct 주석).
 */
export function parseXboxDescriptions(raw: unknown): Map<string, XboxDescription> {
  const out = new Map<string, XboxDescription>();
  const parsed = descriptionEnvelope.safeParse(raw);
  if (!parsed.success) return out;
  for (const p of parsed.data.Products) {
    const lp = p.LocalizedProperties?.[0];
    out.set(p.ProductId.toUpperCase(), { productId: p.ProductId, title: lp?.ProductTitle?.trim() || null, description: lp?.ProductDescription ?? null });
  }
  return out;
}
