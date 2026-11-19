// PlayStation 스토어 예약 특전 읽기 — 기본 상품 긴 소개(preorder-page 가 꺼낸 글) 머리의 특전 목록을 사실로 옮기는 순수 함수들.
//
// 원칙은 Xbox 판(adapters/xbox-preorder)과 같다: 머리말이 있는 특전만 읽고, 특전 이름, 묶음 구성, 마감일만 옮긴다.
// 소개 문장, ※ 안내문은 옮기지 않는다. 같은 퍼블리셔가 두 스토어에 같은 글을 올려 꼴이 거의 같아서, 머리말 판정(readHeading),
// 마감일(deadlineOf), 특전 줄 만들기(xboxBonusRows)는 Xbox 것을 그대로 쓴다.
//
// PS 소개에서 더 본 꼴(2026-11-19 실측, 한국 예약 PS5 줄 28건):
//   【예약 특전】(2027년 1월 20일 23:59까지) / [예약 구매 특전]세트 이름 — 괄호 머리말 뒤에 기한이나 이름이 붙는다(방랑검, 카리아의 아틀리에)
//   ■ 예약 혜택: 이름 — "혜택" 이라고 적는다(레이튼 교수)
//   【프리오더 특전】 바로 다음 줄이 항목 표시 없는 특전 이름(Fate/EXTRA Record)
//   이름 붙은 머리말 다음 빈 줄 뒤 설명 한 문단 — 그 문단은 넘기고 다음 머리말까지 본다(카리아의 아틀리에, 약사의 혼잣말)
//   특전을 말하는 안내 문장 + "수록 내용", "■세트 내용" 소제목 + 항목(스트레인저 댄 헤븐, 로맨싱 사가 3)
//   "…다음이 포함된 …을 받으세요." 바로 아래 항목(Fable)
//   "– " 항목, "세트:" 항목 아래 다른 표시의 하위 항목(갓 오브 워 라우페이)
//   첫 줄 한 문장 안의 물건 이름: "…포함된 레거시 코스튬 팩을 받을 수 있습니다." — 팩, 세트, DLC, 코스튬, 의상, 스킨으로 끝나는
//     이름이 "을/를 받/획득" 바로 앞에 올 때만 그 이름을 잘라 낸다(레이맨, 엣지 오브 메모리즈, 메트로 2039 등)
// 읽지 않는 것: "지금 … 예약 구매하고 … 날아오르세요!"(윙스 클럽), "…독점 Ferrari J50을 받으세요!"(이름 끝말이 없다) — 틀린 특전보다 빠진 특전이 낫다.
//
// 줄 읽기 고리를 Xbox 와 따로 두는 이유: 위 꼴을 Xbox 고리에 넣으면 이미 공개 중인 Xbox 특전이 말없이 바뀐다.
// 두 고리를 합치는 것은 Xbox 미리 보기로 달라지는 글을 센 뒤에 한다.
// 네트워크, DB 를 모른다. 받아 오기는 psstore/index 의 fetchPsstoreDescription, 반영은 sync/psstore-preorder-bonuses 가 한다.
import { deadlineOf, readHeading, XBOX_BONUS_DEFAULT_LABEL, XBOX_BONUS_HEAD_LINES, XBOX_BONUS_ITEM_MAX, type XboxBonusGroup, type XboxPreorderBonus } from "../xbox-preorder";

/**
 * 파서 판(preorder_bonus_posts.parse_version). 규칙을 고치면 올린다.
 * 1: 2026-11-19 첫 판(Xbox 머리말 + 괄호 뒤 이름, 혜택, 안내 문장 + 소제목, 첫 줄 물건 이름)
 */
export const PSSTORE_PREORDER_PARSE_VERSION = 1;
/** 안내 문장이 예약이 아니라 "…까지 구매하면" 일 때 붙일 이름(로맨싱 사가 3) */
export const PSSTORE_EARLY_BONUS_LABEL = "조기 구매 특전";
/** 이름으로 볼 줄의 최대 글자 수. 실측 이름 중 가장 긴 것이 "카리아의 아틀리에 노크타렘 개척 준비 세트" 언저리(25자)라 여유를 뒀다 */
const NAME_MAX = 60;
/** 첫 줄 문장에서 잘라 낸 이름의 최대 글자 수. 실측 최장 "생존 의상(조기 잠금 해제)"(15자). 길면 자르기를 잘못한 것이다 */
const SENTENCE_NAME_MAX = 40;

export type PsstorePreorderBonus = XboxPreorderBonus;

const BULLET = /^[-–・•▼]\s*/;
const SQUARE_MARK = /^■\s*/;
const NOTE = /^[※*]/;
const QUOTED_ONLY = /^「([^」]+)」$/;
const BRACKET_LINE = /^[[【](.+)[\]】]$/;
const SEPARATOR = /^[-*=_]{5,}$/;
/** 괄호 머리말 뒤에 글이 더 붙은 줄: "[예약 구매 특전]카리아의 …", "【예약 특전】(2027년 … 까지)" */
const BRACKET_TRAIL = /^[[【]([^\]】]*(?:특전|보너스|혜택)[^\]】]*)[\]】]\s*(\S.*)$/;
/** 괄호 뒤가 기한 괄호뿐인 경우. 기한은 마감일 칸이 말한다 */
const PAREN_ONLY = /^[(（][^)）]*[)）]$/;
/** "■ 예약 혜택: 이름". 혜택은 광고 문구에도 흔해서 예약, 구매가 붙은 짧은 머리말만 받는다 */
const BENEFIT_HEADING = /^■?\s*([^:：]{0,10}(?:예약|구매|구입)[^:：]{0,6}혜택)\s*[:：]\s*(\S.*)$/;
/** 안내 문장 뒤 소제목. "■세트 내용"(로맨싱 사가 3), "수록 내용"(스트레인저 댄 헤븐) */
const CONTENT_HEADING = /^■?\s*(?:수록 내용|세트 내용|구성 내용|구성품?|특전 내용)\s*[:：]?$/;
/** 문장으로 끝나는 줄. 이름이 아니라 설명이다 */
const SENTENCE_END = /(?:[.!?。！？]|다)$/;
const PREORDER_CUE = /예약|사전\s*주문|프리오더/;
const BUY_CUE = /예약|구매|구입|주문/;
const GET_CUE = /받|증정|획득|제공/;
/** "다음이 포함된", "아래 콘텐츠" — 바로 아래에 목록이 온다고 말하는 문장 */
const LIST_CUE = /다음|아래/;
/** 첫 줄 문장 안 물건 이름의 끝: "…팩을 획득", "…DLC를 받", "…의상(조기 잠금 해제)을 받" */
const SENTENCE_ITEM = /(?:팩|세트|DLC|코스튬|의상|스킨)(?:\s*\([^)]*\))?(?=\s*(?:을|를)\s*(?:받|획득))/;
/** 이름 앞을 끊는 자리: 관형, 연결 어미 뒤 띄어쓰기("포함된 ", "있는 ", "스킨인 ", "하시면 ", "하고, ") */
const NAME_BOUNDARY = /(?:된|는|인|면|고),?\s+/g;

type Heading = { label: string; setName: string | null; inline: string | null };
type Draft = XboxBonusGroup & {
  /** 머리말이 이름을 품었거나 다음 줄을 이름으로 받았다 — 그 뒤 설명 한 문단을 넘길 수 있다 */
  named: boolean;
  /** 설명 문단을 이미 하나 넘겼다 */
  skipped: boolean;
  /** 머리말 바로 다음 줄을 아직 안 봤다 */
  fresh: boolean;
};
type Lead = { line: string; label: string; list: boolean };
type SubList = { index: number; bullet: string; base: string; items: string[] };

const clean = (s: string): string => s.replace(/\s+/g, " ").trim();

/** 머리말 이름 다듬기. 각주 표시(¹), 끝의 "구성품" 을 걷는다 — "예약 주문 보너스 구성품¹" 은 "예약 주문 보너스" 다 */
function tidyLabel(label: string): string {
  const s = clean(label.replace(/[¹²³⁴-⁹⁰]/g, "").replace(/\s*구성품?$/, ""));
  return /특전|보너스|혜택/.test(s) ? s : XBOX_BONUS_DEFAULT_LABEL;
}

/** 이 줄이 특전 머리말이면 그 뜻. PS 에만 본 꼴을 먼저 보고, 아니면 Xbox 머리말 규칙을 쓴다 */
export function readPsstoreHeading(line: string): Heading | null {
  if (BULLET.test(line) || NOTE.test(line) || line.length > XBOX_BONUS_ITEM_MAX) return null;
  const trail = BRACKET_TRAIL.exec(line);
  if (trail) {
    const rest = clean(trail[2]);
    if (PAREN_ONLY.test(rest)) return { label: tidyLabel(trail[1]), setName: null, inline: null };
    // 괄호 뒤가 이름이면 세트 이름, 문장이면 그 문장이 곧 특전 내용이다(Xbox 의 한 줄 머리말과 같다)
    const isName = rest.length <= NAME_MAX && !SENTENCE_END.test(rest);
    return { label: tidyLabel(trail[1]), setName: isName ? rest : null, inline: isName ? null : rest };
  }
  const benefit = BENEFIT_HEADING.exec(line);
  if (benefit) return { label: tidyLabel(benefit[1]), setName: null, inline: clean(benefit[2]) };
  const base = readHeading(line);
  return base ? { ...base, label: tidyLabel(base.label) } : null;
}

/** 첫 머리말 전의 안내 문장이면 그 뜻. 특전을 말하거나(특전), 사고 받는다고 말해야 한다(구매 + 받/증정) */
function readLead(line: string): Lead | null {
  if (line.length > XBOX_BONUS_ITEM_MAX) return null;
  if (!/특전/.test(line) && !(BUY_CUE.test(line) && GET_CUE.test(line))) return null;
  const preorder = PREORDER_CUE.test(line);
  return { line, label: preorder ? XBOX_BONUS_DEFAULT_LABEL : PSSTORE_EARLY_BONUS_LABEL, list: preorder && LIST_CUE.test(line) && GET_CUE.test(line) };
}

/** 항목이면 [표시, 이름]. ■ 줄은 빈 줄 없이 바로 이어질 때만 항목이다(Xbox 와 같은 이유: 빈 줄 뒤 ■ 는 본문 소제목) */
function itemOf(line: string, afterBlank: boolean): { bullet: string | null; text: string } | null {
  const bullet = BULLET.exec(line)?.[0].trim() ?? null;
  const square = !afterBlank && SQUARE_MARK.test(line);
  if (!bullet && !square && !QUOTED_ONLY.test(line)) return null;
  const body = clean(line.replace(BULLET, "").replace(SQUARE_MARK, ""));
  const text = QUOTED_ONLY.exec(body)?.[1] ?? body;
  return text && text.length <= XBOX_BONUS_ITEM_MAX ? { bullet: bullet ?? (square ? "■" : null), text } : null;
}

/** 첫 줄 문장 안의 물건 이름(SENTENCE_ITEM 주석). 못 자르면 null */
function sentenceItem(line: string): string | null {
  if (!PREORDER_CUE.test(line)) return null;
  const m = SENTENCE_ITEM.exec(line);
  if (!m) return null;
  const head = line.slice(0, m.index + m[0].length);
  let start = 0;
  for (const b of head.matchAll(NAME_BOUNDARY)) start = b.index + b[0].length;
  const name = clean(head.slice(start));
  return start > 0 && name.length <= SENTENCE_NAME_MAX && !BUY_CUE.test(name) ? name : null;
}

/**
 * 긴 소개 → 특전 묶음들. 특전이 없으면 null.
 * 묶음이 끝나는 곳은 Xbox 와 같다(다음 머리말, 구분선, 빈 줄 뒤 항목도 안내문도 아닌 줄). 다른 점은 이름 붙은 묶음 뒤
 * 설명 한 문단을 한 번 넘기는 것뿐이다 — 두 번째 문단부터는 본문 소개로 보고 멈춘다.
 */
export function parsePsstorePreorderBonus(description: string | null | undefined): PsstorePreorderBonus | null {
  if (!description) return null;
  const lines = description.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const groups: Draft[] = [];
  let current: Draft | null = null;
  let afterBlank = false;
  let seen = 0;
  let lead: Lead | null = null;
  let sub: SubList | null = null;
  const open = (g: Omit<Draft, "skipped" | "fresh">): Draft => {
    const d: Draft = { ...g, skipped: false, fresh: !g.named };
    groups.push(d);
    sub = null;
    return d;
  };

  for (const line of lines) {
    if (!line) {
      afterBlank = true;
      continue;
    }
    if (SEPARATOR.test(line)) break;
    const heading = readPsstoreHeading(line);
    if (!current || heading) {
      // 첫 머리말은 맨 위 몇 줄 안에서만 찾는다(XBOX_BONUS_HEAD_LINES 주석)
      if (!current && seen++ >= XBOX_BONUS_HEAD_LINES) break;
      if (heading) {
        const items = heading.inline ? [heading.inline] : [];
        current = open({ label: heading.label, setName: heading.setName, items, endsOn: deadlineOf(line), named: Boolean(heading.setName || heading.inline) });
        afterBlank = false;
        continue;
      }
      if (lead && CONTENT_HEADING.test(line)) {
        current = open({ label: lead.label, setName: null, items: [], endsOn: deadlineOf(lead.line), named: false });
        afterBlank = false;
        continue;
      }
      // "다음/아래" 문장 바로 아래 항목이면 그 문장이 머리말이다. 그 밖의 줄은 다음 줄의 안내 문장 후보가 된다
      if (!(lead?.list && !afterBlank && itemOf(line, false))) {
        lead = readLead(line);
        afterBlank = false;
        continue;
      }
      current = open({ label: lead.label, setName: null, items: [], endsOn: deadlineOf(lead.line), named: false });
    }
    // 항목이 이미 있는 묶음 뒤의 소제목(【구성】, 구성품:)은 에디션 구성이다 — 여기서 특전이 끝난다
    const subHeading = BRACKET_LINE.test(line) || CONTENT_HEADING.test(line);
    if (subHeading && current.items.length > 0) break;
    const item = subHeading ? null : itemOf(line, afterBlank);
    const note = NOTE.test(line);
    if (!item && !note && !subHeading) {
      if (current.fresh && !afterBlank && line.length <= NAME_MAX && !SENTENCE_END.test(line)) {
        current.items.push(clean(line));
        current.named = true;
        current.fresh = false;
        continue;
      }
      if (afterBlank) {
        if (!current.named || current.skipped) break;
        current.skipped = true;
      }
    }
    current.fresh = false;
    afterBlank = false;
    current.endsOn ??= deadlineOf(line);
    if (!item) continue;
    // "• 세트:" 아래 다른 표시("-")로 적은 하위 항목은 세트 이름 뒤 괄호로 모은다
    const s: SubList | null = sub;
    if (s && item.bullet && item.bullet !== s.bullet) {
      s.items.push(item.text);
      current.items[s.index] = `${s.base}(${s.items.join(", ")})`;
      continue;
    }
    sub = null;
    if (item.bullet && /[:：]$/.test(item.text)) {
      const base = clean(item.text.replace(/[:：]$/, ""));
      sub = { index: current.items.length, bullet: item.bullet, base, items: [] };
      current.items.push(base);
    } else current.items.push(item.text);
  }

  const kept = groups.filter((g) => g.items.length > 0 || g.setName).map(({ label, setName, items, endsOn }) => ({ label, setName, items, endsOn }));
  if (kept.length > 0) return { groups: kept };
  // 머리말이 하나도 없으면 첫 줄 문장 안의 물건 이름만 본다
  const first = lines.find((l) => l);
  const name = first ? sentenceItem(first) : null;
  return name ? { groups: [{ label: XBOX_BONUS_DEFAULT_LABEL, setName: null, items: [name], endsOn: deadlineOf(first!) }] } : null;
}
