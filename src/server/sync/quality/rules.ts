// 데이터 점검기의 규칙 — 수집이 쌓은 카탈로그에서 사람이 손으로 고치던 꼴을 찾아 판정한다(2026-10-28 사용자 지시:
// "내가 손으로 고친 일을 자동화할 수 있냐", 데이터 가공이 서비스의 핵심이다).
//
// 판정은 세 갈래다.
//   auto       근거가 하나로 모여 틀릴 여지가 없는 것. 적용기가 바로 고치고, 수집이 되돌리지 않게 칸을 잠근다
//   candidate  고칠 안은 있지만 사람이 한 번 봐야 하는 것. 관리자 "데이터 점검" 화면에 올라가고 버튼 하나로 적용한다
//   notify     고칠 안을 기계가 못 내는 것(스토어에 직접 물어야 판정된다). 화면에 띄우고 알림만 한다
//
// 이 파일은 DB 를 모른다 — 읽어 온 행을 받아 판정만 돌려준다(테스트가 픽스처로 돈다). 읽기는 load.ts, 쓰기는 apply.ts.
// 규칙을 늘릴 때: 손으로 고친 판정 하나를 여기 함수 하나로 옮기고, 그 사례를 테스트 픽스처로 남긴다.
import type { ContentType } from "@/server/db/schema";
import { seriesConflict } from "@/lib/slug";

export type QualityRule =
  | "parent_more_specific"
  | "release_date_gap"
  | "parent_chain"
  | "self_parent"
  | "shared_store_id"
  | "game_with_parent"
  | "duplicate_title"
  | "mixed_identity";
export type Verdict = "auto" | "candidate" | "notify";

/** 적용할 수 있는 고침. notify 는 고침이 없다 */
export type QualityFix =
  | { kind: "set_parent"; gameId: string; from: string | null; to: string }
  | { kind: "promote_game"; gameId: string; from: string }
  | { kind: "set_release_date"; platformRowId: string; date: string }
  | { kind: "set_content_type"; gameId: string; from: ContentType; to: ContentType }
  | { kind: "unlink_meta_ref"; gameId: string; source: string; externalId: string }
  /** 섞인 스토어 판을 떼어 낸다. toGameId 가 null 이면 title 로 새 행을 세운다 */
  | { kind: "split_store_ref"; gameId: string; source: string; externalId: string; title: string; toGameId: string | null };

export interface QualityFinding {
  rule: QualityRule;
  verdict: Verdict;
  /** 같은 일을 두 번 올리지 않는 열쇠. 규칙 안에서 유일하다 */
  subjectKey: string;
  /** 화면이 게임 상세로 잇는 대상. 공유 ID 처럼 여럿이면 첫 게임 */
  gameId: string;
  /** 사람이 읽는 한 줄 근거(관리자 화면에 그대로 나간다) */
  reason: string;
  fix: QualityFix | null;
}

export interface QualityGame {
  id: string;
  /** 같은 제목 중복 판정에서 옛 DB 병합 꼬리(-8자리 16진)를 알아보는 데 쓴다 */
  slug?: string;
  titleEn: string;
  contentType: ContentType;
  parentGameId: string | null;
}

export interface QualityPlatformRow {
  id: string;
  gameId: string;
  platform: string;
  releaseDate: string | null;
  /** 값이 붙어 있는가 = 지금 파는 행인가. 안 파는 행의 빈 출시일은 고칠 일이 아니다 */
  priced: boolean;
  /** 본편이 아닌 행(에디션, 추가 콘텐츠, 묶음)의 판인가. 이식판이 따로 나오지 않아 형제 날짜를 그대로 쓴다 */
  addon?: boolean;
}

export interface SharedStoreId {
  source: string;
  externalId: string;
  gameIds: string[];
}

/** 부모를 더 구체적인 본편으로 옮길 수 있는 갈래. 묶음(bundle)은 여러 작품을 담아 제목 하나로 판정할 수 없다 */
const REHOME_TYPES: ReadonlySet<ContentType> = new Set(["dlc", "edition"]);
/**
 * 옮겨 갈 본편 제목의 최소 낱말 수. 한 낱말 본편("Doom", "Control")은 흔한 낱말이 접두로 우연히 맞는다 —
 * 2026-10-28 콜 오브 듀티 묶음 사례의 본편들은 모두 넷 이상이었다
 */
const REHOME_MIN_WORDS = 2;
/**
 * 지금 부모가 남의 작품일 때 자동으로 옮길 본편 제목의 최소 낱말 수. 2026-11-04 관리자가 손으로 옮긴 26건의 본편
 * (Bus Simulator 27, Need for Speed Unbound, Magical Girl Witch Trials, Call of Duty Black Ops 7)은 모두 셋 이상이었다.
 * 두 낱말 본편("Spider Man 2")은 옛 작품과 새 작품이 같은 접두를 나눠 써서 사람에게 묻는다
 */
const REHOME_OTHER_MIN_WORDS = 3;
/**
 * 업그레이드는 본편 소유자가 사는 것이라 제목 접두가 가리키는 묶음(Cross-Gen Bundle)이 아니라 본편 밑이 맞다 —
 * 제목만으로는 자리를 못 고른다(2026-11-04 Vanguard Cross-Gen Bundle Upgrade). rules-structure 의 갈래 판정도 쓴다
 */
export const UPGRADE_WORDS = /\bupgrade\b|アップグレード|업그레이드/i;
/** 출시일을 형제 행에서 빌릴 때 서로 다른 날짜를 같은 날로 보는 폭. 스토어마다 UTC, 현지 날짜를 섞어 쓴다 */
const RELEASE_AGREE_DAYS = 1;
/** 자동으로 채우려면 날짜를 낸 형제 행이 이만큼 있어야 한다. 하나뿐이면 늦게 나온 이식판을 앞당길 수 있다 */
const RELEASE_AUTO_MIN_SOURCES = 2;
/**
 * 이 날수 안의 작품만 본다 — 오래된 작품의 빈 칸은 대개 나중에 나온 이식판이라 형제 날짜를 빌리면 틀린다
 * (2026-10-28 실측: 2022 년 작품의 switch2 행). 거르지 않으면 후보가 90건이었고 대부분 몇 년 된 작품의 Epic, 스위치 행이었다.
 */
const RELEASE_RECENT_DAYS = 365;
/**
 * 기기가 나온 날. 형제 날짜가 이보다 이르면 그 행은 이식판이 확실해 빌릴 날짜가 없다 — 판정 자체를 내지 않는다.
 * Steam, Epic, Xbox(두 세대를 한 행으로 쓴다)는 기준이 없다
 */
const PLATFORM_LAUNCH: Readonly<Record<string, string>> = {
  ps4: "2013-11-15",
  ps5: "2020-11-12",
  switch: "2017-03-03",
  switch2: "2025-06-05",
};
const DAY_MS = 86_400_000;

/**
 * 빈 칸에 넣을 날짜 — 형제 행에 가장 많이 나온 날, 같으면 늦은 날.
 * 맨 이른 날을 쓰면 하루 틀린다: 스토어 몇 곳(Xbox 등)은 한국 자정 출시를 UTC 로 적어 전날이 된다(2026-10-29 실측:
 * 레지던트 이블 레퀴엠 Xbox 02-26, 나머지 셋 02-27). 우리 화면은 한국 날짜라 갈리면 늦은 쪽이 맞다
 */
export function pickReleaseDate(dated: readonly string[]): string {
  const count = new Map<string, number>();
  for (const d of dated) count.set(d, (count.get(d) ?? 0) + 1);
  let best = dated[0];
  for (const [d, n] of count) {
    const bn = count.get(best) ?? 0;
    if (n > bn || (n === bn && d > best)) best = d;
  }
  return best;
}

/** 낱말 경계를 지키는 비교용 제목. 구두점, 상표 기호를 공백으로 */
export function titleWords(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** titleWords 결과에서 공백까지 지운 것. 스토어마다 띄어쓰기가 갈린다("Watch Dogs2", "Watch_Dogs 2") */
export function compactWords(words: string): string {
  return words.replace(/ /g, "");
}

/** a 가 b 의 낱말 단위 접두인가. "modern warfare ii" 는 "modern warfare iii x" 의 접두가 아니다 */
export function isWordPrefix(prefix: string, full: string): boolean {
  return prefix.length > 0 && (full === prefix || full.startsWith(prefix + " "));
}

/**
 * ① 묶음, 런처 밑의 추가 콘텐츠를 제 작품으로.
 * 2026-10-28 사례: Xbox 가 콜 오브 듀티 추가 콘텐츠의 본편을 시리즈 런처로 내놓아 "Call of Duty: Black Ops 7 - Command Force"
 * 같은 행 20개가 런처 "Call of Duty" 밑에 몰렸다. 제목이 지금 부모보다 더 긴 본편 제목으로 시작하면 그 본편이 제자리다.
 *
 * auto 조건 셋: 지금 부모가 값 붙은 플랫폼이 없는 행(런처, 묶음 껍데기)이다, 지금 부모의 제목이 옮겨 갈 본편 제목의 접두다
 * (같은 시리즈 안에서 더 구체적인 쪽으로만 간다), 후보가 하나다. 나머지는 candidate.
 * 첫 조건이 있는 이유(2026-10-28 실측): "Dragon's Dogma 2: Dark Arisen Expansion" 이 제대로 본편 밑에 있는데,
 * Xbox 묶음 상품 "Dragon's Dogma 2: Dark Arisen" 이 본편으로 잘못 앉아 있어 그 밑으로 옮기라는 판정이 났다.
 * 파는 본편 밑에 있는 행은 스토어가 그 본편을 말한 것이라, 제목만으로 떼어 내면 안 된다.
 */
export function findParentMoreSpecific(
  games: readonly QualityGame[],
  lockedParent: ReadonlySet<string>,
  pricedGameIds: ReadonlySet<string>,
): QualityFinding[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  const bases = games
    .filter((g) => g.contentType === "game" && !g.parentGameId)
    .map((g) => ({ g, words: titleWords(g.titleEn) }))
    .filter((b) => b.words.split(" ").length >= REHOME_MIN_WORDS);
  // 접두가 맞으려면 첫 낱말부터 같아야 한다 — 첫 낱말로 묶어 두면 행 수의 곱을 다 훑지 않는다(카탈로그가 수만 건이다)
  const byFirstWord = new Map<string, typeof bases>();
  for (const b of bases) {
    const first = b.words.split(" ")[0];
    byFirstWord.set(first, [...(byFirstWord.get(first) ?? []), b]);
  }
  const out: QualityFinding[] = [];
  for (const child of games) {
    if (!child.parentGameId || !REHOME_TYPES.has(child.contentType) || lockedParent.has(child.id)) continue;
    const parent = byId.get(child.parentGameId);
    if (!parent) continue;
    const childWords = titleWords(child.titleEn);
    const parentWords = titleWords(parent.titleEn);
    let best: typeof bases = [];
    for (const b of byFirstWord.get(childWords.split(" ")[0]) ?? []) {
      if (b.g.id === parent.id || b.g.id === child.id || !isWordPrefix(b.words, childWords) || b.words === childWords) continue;
      if (b.words.length <= parentWords.length) continue;
      // 띄어쓰기만 다른 같은 제목이면 옮길 일이 아니라 본편 중복이다 — duplicate_title 몫(2026-11-04 Watch Dogs2 대 Watch_Dogs 2)
      if (compactWords(b.words) === compactWords(parentWords)) continue;
      if (best.length === 0 || b.words.length > best[0].words.length) best = [b];
      else if (b.words.length === best[0].words.length) best.push(b);
    }
    if (best.length === 0) continue;
    const to = best[0].g;
    const narrowing = isWordPrefix(parentWords, best[0].words);
    // 지금 부모가 아예 다른 작품인가 — 제목이 부모 제목으로 시작하지 않거나(EA FC 27 밑의 Bus Simulator 27 팩),
    // 시리즈 번호가 갈린다(Black Ops 밑의 Black Ops 7 Vault Edition). 파는 본편 밑이어도 그 본편이 남의 것이면 옮긴다
    // 접두는 공백을 지우고 본다 — "Watch Dogs2" 와 "Watch_Dogs 2" 는 띄어쓰기만 다른 같은 작품이다(2026-11-04 실측).
    // 번호 비교도 낱말 접두가 맞을 때만 한다 — 붙여 쓴 "Dogs2" 의 2 는 번호로 안 읽혀 1편으로 잡힌다
    const parentIsOther =
      !compactWords(childWords).startsWith(compactWords(parentWords)) ||
      (isWordPrefix(parentWords, childWords) && seriesConflict(parent.titleEn, to.titleEn));
    const rehomeFromOther =
      parentIsOther && best[0].words.split(" ").length >= REHOME_OTHER_MIN_WORDS && !UPGRADE_WORDS.test(child.titleEn);
    const verdict: Verdict = best.length === 1 && ((narrowing && !pricedGameIds.has(parent.id)) || rehomeFromOther) ? "auto" : "candidate";
    const reason =
      best.length > 1
        ? `"${child.titleEn}" 이 "${to.titleEn}" 로 시작하는데 같은 제목 본편이 ${best.length}개예요`
        : `"${child.titleEn}" 이 "${parent.titleEn}" 밑에 있는데 제목은 "${to.titleEn}" 로 시작해요`;
    out.push({
      rule: "parent_more_specific",
      verdict,
      subjectKey: child.id,
      gameId: child.id,
      reason,
      fix: { kind: "set_parent", gameId: child.id, from: parent.id, to: to.id },
    });
  }
  return out;
}

/**
 * ② 파는 행인데 출시일이 빈 것을 같은 게임의 다른 플랫폼 날짜로.
 * 2026-10-28 사례: BO7 PS 행을 상품 id 로 바꾸자 상품 응답이 출시일을 안 줘 비었다. 수집은 null 로 덮지 않으므로
 * 채운 값은 스토어가 날짜를 줄 때까지만 쓰이고, 주면 그 값으로 바뀐다(잠그지 않는다).
 *
 * 2026-11-04 사람에게 묻는 갈래(candidate)를 걷었다. 관리자 판정 세 회차(11-02, 11-03 2,280건, 11-04)가 한 번도
 * 갈리지 않았다 — 형제 둘 이상이 맞으면 채우고, 본편이 아닌 행이면 채우고, 본편 행인데 날짜를 낸 곳이 하나이거나
 * 날짜가 갈리면 넘겼다(이식판 위험). 앞 둘은 auto 로, 마지막은 판정을 내지 않는다. 스토어가 날짜를 주면 저절로 찬다.
 */
export function findReleaseDateGaps(rows: readonly QualityPlatformRow[], now: Date): QualityFinding[] {
  const byGame = new Map<string, QualityPlatformRow[]>();
  for (const r of rows) byGame.set(r.gameId, [...(byGame.get(r.gameId) ?? []), r]);
  const out: QualityFinding[] = [];
  for (const [gameId, list] of byGame) {
    const dated = list.filter((r) => r.releaseDate).map((r) => r.releaseDate as string).sort();
    if (dated.length === 0) continue;
    for (const r of list) {
      if (r.releaseDate || !r.priced) continue;
      const earliest = dated[0];
      const fill = pickReleaseDate(dated);
      const launch = PLATFORM_LAUNCH[r.platform];
      if (launch && earliest < launch) continue;
      const spreadDays = (Date.parse(dated[dated.length - 1]) - Date.parse(earliest)) / DAY_MS;
      const ageDays = (now.getTime() - Date.parse(earliest)) / DAY_MS;
      if (ageDays > RELEASE_RECENT_DAYS) continue;
      const agree = dated.length >= RELEASE_AUTO_MIN_SOURCES && spreadDays <= RELEASE_AGREE_DAYS;
      if (!agree && !r.addon) continue;
      out.push({
        rule: "release_date_gap",
        verdict: "auto",
        subjectKey: r.id,
        gameId,
        reason: agree
          ? `${r.platform} 출시일이 비어 있어요. 다른 플랫폼 ${dated.length}곳이 ${fill} 로 맞아요`
          : `${r.platform} 출시일이 비어 있어요. 본편이 아닌 행이라 다른 플랫폼 날짜 ${fill} 로 채워요`,
        fix: { kind: "set_release_date", platformRowId: r.id, date: fill },
      });
    }
  }
  return out;
}

/** 사슬을 따라 올라가는 상한. 고리가 있어도 끝나야 한다(sync/parent-root 와 같은 값) */
const CHAIN_MAX_HOPS = 4;

/**
 * ③ 부모의 부모가 있는 행(사슬)을 맨 위 본편으로. 사슬 밑 행은 본편 화면의 추가 콘텐츠 목록에서 사라진다.
 * 수집은 붙일 때 맨 위로 올리지만(sync/parent-root), 붙인 뒤에 부모가 다른 밑으로 들어가면 사슬이 생긴다.
 * 잠근 부모는 사람이 고른 자리라 candidate 로만 올린다. ④ 자기 자신이 부모인 행도 여기서 같이 본다.
 */
export function findParentChains(games: readonly QualityGame[], lockedParent: ReadonlySet<string>): QualityFinding[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  const out: QualityFinding[] = [];
  for (const g of games) {
    if (!g.parentGameId) continue;
    if (g.parentGameId === g.id) {
      out.push({
        rule: "self_parent",
        verdict: "candidate",
        subjectKey: g.id,
        gameId: g.id,
        reason: `"${g.titleEn}" 이 자기 자신을 부모로 가리켜요. 본편이 추가 콘텐츠로 앉아 목록에서 빠졌을 수 있어요`,
        fix: { kind: "promote_game", gameId: g.id, from: g.id },
      });
      continue;
    }
    const parent = byId.get(g.parentGameId);
    if (!parent?.parentGameId) continue;
    let root = parent;
    for (let i = 0; i < CHAIN_MAX_HOPS && root.parentGameId && root.parentGameId !== root.id; i++) {
      const up = byId.get(root.parentGameId);
      if (!up || up.id === g.id) break;
      root = up;
    }
    if (root.id === parent.id || root.id === g.id) continue;
    out.push({
      rule: "parent_chain",
      verdict: lockedParent.has(g.id) ? "candidate" : "auto",
      subjectKey: g.id,
      gameId: g.id,
      reason: `"${g.titleEn}" 의 부모 "${parent.titleEn}" 이 다시 "${root.titleEn}" 밑에 있어요`,
      fix: { kind: "set_parent", gameId: g.id, from: parent.id, to: root.id },
    });
  }
  return out;
}

/**
 * ⑤ 한 스토어 상품 id 를 게임 둘 이상이 나눠 가진 것. 같은 값이 두 화면에 붙는다(2026-09-24 COD 가격 공유 사례).
 * 어느 쪽이 주인인지는 스토어 제목을 다시 봐야 정해져서 고침을 내지 않는다.
 */
export function findSharedStoreIds(shared: readonly SharedStoreId[]): QualityFinding[] {
  return shared.map((s) => ({
    rule: "shared_store_id" as const,
    verdict: "notify" as const,
    subjectKey: `${s.source}:${s.externalId}`,
    gameId: s.gameIds[0],
    reason: `${s.source} 상품 ${s.externalId} 를 게임 ${s.gameIds.length}개가 같이 쥐고 있어요`,
    fix: null,
  }));
}
