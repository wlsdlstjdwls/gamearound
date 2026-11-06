// 데이터 점검기의 섞인 정체 규칙 — 한 게임 행에 다른 게임의 연결이 붙은 것을 찾는다(2026-11-06).
//
// 왜 생겼나: 11-02 옛 DB 병합이 행을 합칠 때 연결(game_source_refs)을 엉뚱한 행으로 옮긴 곳이 있다. 실측 110행 남짓 —
// 1000xRESIST 행에 "100% Orange Juice" 의 HLTB, 메타크리틱, 위키데이터가, Dead Age 2 행에 Dead Space 2 의 스팀 판이 붙어
// 화면에 남의 플레이타임, 점수, 가격이 떴다. 수집은 연결을 믿고 값을 계속 덮으니 저절로 낫지 않는다.
//
// 판정 둘.
//   평점 소스(HLTB, 메타크리틱, 오픈크리틱, 위키데이터)  auto 로 연결을 끊고 그 소스가 넣은 값을 지운다.
//     잘못 이으면 남의 값이 박히고, 잘못 끊으면 그 값 하나가 빠졌다가 다음 매칭에서 돌아온다 — 손해가 끊는 쪽이 작다
//     (매칭 큐 판정과 같은 기준, "애매하면 무른다"). 매처는 제목이 닮아야 잇기 때문에 정상 매칭이 이 꼴이 될 수 없다.
//   스토어 판(스팀, Xbox 등)  candidate. 그 판(플랫폼 행, 가격 이력째)과 연결을 같은 제목 행으로 옮기거나, 없으면 새 행으로 떼어 낸다.
//     자동으로 하지 않는 이유: "Resident Evil 6" 대 "BIOHAZARD 6" 처럼 지역 이름이 딴판인 같은 게임이 있다(11-06 실측 2건).
//
// 섞였다고 보는 조건: 그 연결의 제목이 행 제목, 스토어 판 제목 어느 것과도 닮지 않았고, **행 제목을 받쳐 주는 다른 연결이 하나 이상**
// 있다. 받쳐 주는 연결이 없으면 행 제목 쪽이 틀렸을 수 있다(Five Hearts Under One Roof 행의 제목이 위키데이터 것으로 덮인 꼴) — 그때는 판정하지 않는다.
// 한글, 일본어 제목은 비교하지 않는다. 같은 게임의 한글 이름과 영문 이름은 글자가 하나도 안 겹친다.
//
// 사람이 이은 연결(manual)은 건드리지 않는다. rules.ts 와 같은 약속: DB 를 모른다, 판정만 돌려준다.
import { isWordPrefix, titleWords, type QualityFinding, type QualityGame } from "./rules";

export interface QualityRef {
  gameId: string;
  source: string;
  externalId: string;
  matchedTitle: string;
  matchedBy: "auto" | "manual";
}

/** 연결을 끊으면 값만 빠지는 소스. 스토어가 아니라 판매 행이 없다 */
export const META_SOURCES: ReadonlySet<string> = new Set(["hltb", "metacritic", "opencritic", "wikidata_game"]);
/** 낱말 겹침에서 빼는 말. 이것만 겹쳐서는 같은 게임이라 할 수 없다 */
const STOP_WORDS = new Set(["the", "a", "an", "of", "and", "in", "on", "to", "for"]);
/** 낱말 자카드 문턱. 0.5 아래는 "Halo Campaign Evolved" 대 "Halo Wars"(0.25), "Digimon Survive" 대 "Digimon World Next Order"(0.25) 꼴이다 */
const RELATED_JACCARD = 0.5;
/** 한쪽이 다른 쪽을 품는지 볼 때 짧은 쪽의 최소 글자 수. 너무 짧으면 아무 제목에나 들어간다 */
const CONTAIN_MIN_CHARS = 4;
const NON_LATIN = /[\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

/** 로마 숫자 번호. HLTB, 메타크리틱은 "Outlast II", 스토어는 "Outlast 2" 로 적는다(실측 10건) */
const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
/** 상표 기호. NFKD 가 ™ 를 "TM" 으로 풀어 "FC™ 24" 가 "fctm 24" 가 된다 */
const MARKS = /[™®©]/g;

const tokens = (t: string) =>
  titleWords(t.replace(MARKS, ""))
    .split(" ")
    .filter(Boolean)
    .map((w) => ROMAN[w] ?? w);
const words = (t: string) => tokens(t).filter((w) => !STOP_WORDS.has(w));

/** 같은 게임의 다른 표기일 수 있는가. 판본 꼬리("Anniversary Edition", "Nintendo Switch 2 Edition")는 품기로 받는다 */
export function titlesRelated(a: string, b: string): boolean {
  const ca = tokens(a).join("");
  const cb = tokens(b).join("");
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  const [short, long] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  if (short.length >= CONTAIN_MIN_CHARS && long.includes(short)) return true;
  // 짧은 제목은 낱말 단위 접두로만 받는다("XEL" 대 "XEL - Complete Edition", "VED" 대 "VED PS4 & PS5")
  const [ta, tb] = [tokens(a).join(" "), tokens(b).join(" ")];
  if (isWordPrefix(ta, tb) || isWordPrefix(tb, ta)) return true;
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  const shared = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 && shared / union >= RELATED_JACCARD;
}

const comparable = (t: string | null | undefined): t is string => Boolean(t && t.trim() && !NON_LATIN.test(t));

/** 같은 제목 행 찾기 열쇠. 떼어 낸 판이 갈 제 행이 이미 있으면 새로 세우지 않는다 */
const titleKey = (t: string) => tokens(t).join("");

export function findMixedIdentity(games: readonly QualityGame[], refs: readonly QualityRef[]): QualityFinding[] {
  const byTitle = new Map<string, string[]>();
  for (const g of games) {
    const k = titleKey(g.titleEn);
    if (k) byTitle.set(k, [...(byTitle.get(k) ?? []), g.id]);
  }
  const byGame = new Map<string, QualityRef[]>();
  for (const r of refs) if (comparable(r.matchedTitle)) byGame.set(r.gameId, [...(byGame.get(r.gameId) ?? []), r]);
  const out: QualityFinding[] = [];
  for (const g of games) {
    const list = byGame.get(g.id);
    if (!list || list.length < 2 || !comparable(g.titleEn)) continue;
    const storeTitles = list.filter((r) => !META_SOURCES.has(r.source));
    for (const r of list) {
      if (r.matchedBy !== "auto") continue;
      const others = list.filter((o) => o !== r);
      if (titlesRelated(r.matchedTitle, g.titleEn)) continue;
      // 행 제목을 받쳐 주는 다른 연결이 없으면 어느 쪽이 틀렸는지 모른다
      const support = others.filter((o) => titlesRelated(o.matchedTitle, g.titleEn));
      if (support.length === 0) continue;
      // 받침이 평점 소스뿐이면 그 받침도 섞인 것일 수 있다 — 이 연결이 다른 어느 연결과도 안 닮았을 때만 판정한다
      // (Five Hearts Under One Roof 행: 제목과 위키데이터가 "Kindred Spirits on the Roof", HLTB 와 메타크리틱이 제 게임이었다)
      const storeBacked = support.some((o) => !META_SOURCES.has(o.source));
      if (!storeBacked && others.some((o) => titlesRelated(r.matchedTitle, o.matchedTitle))) continue;
      // 스토어 판 제목과 닮았으면 행 제목이 낡은 것일 수 있다 — 평점 소스는 스토어 판만, 스토어 판은 다른 연결 전부와 견준다
      const against = META_SOURCES.has(r.source) ? storeTitles.filter((o) => o !== r) : others;
      if (against.some((o) => titlesRelated(r.matchedTitle, o.matchedTitle))) continue;
      const subjectKey = `${g.id}:${r.source}:${r.externalId}`;
      if (META_SOURCES.has(r.source)) {
        out.push({
          rule: "mixed_identity",
          verdict: "auto",
          subjectKey,
          gameId: g.id,
          reason: `"${g.titleEn}" 에 다른 게임 "${r.matchedTitle}" 의 ${r.source} 연결이 붙어 있어요. 끊고 그 값을 지워요`,
          fix: { kind: "unlink_meta_ref", gameId: g.id, source: r.source, externalId: r.externalId },
        });
        continue;
      }
      // 같은 제목 행이 하나뿐이면 그리로, 없으면 새 행을 세운다. 둘 이상이면 어느 쪽인지 사람이 고른다
      const siblings = (byTitle.get(titleKey(r.matchedTitle)) ?? []).filter((id) => id !== g.id);
      const to = siblings.length === 1 ? siblings[0] : null;
      out.push({
        rule: "mixed_identity",
        verdict: siblings.length > 1 ? "notify" : "candidate",
        subjectKey,
        gameId: g.id,
        reason: `"${g.titleEn}" 에 다른 게임 "${r.matchedTitle}" 의 ${r.source} 판이 섞여 있어요. ${
          siblings.length > 1 ? "같은 제목 행이 여럿이라 옮길 곳을 골라야 해요" : to ? "고치면 같은 제목 행으로 옮겨요" : "고치면 그 판을 새 게임 행으로 떼어 내요"
        }`,
        fix: siblings.length > 1 ? null : { kind: "split_store_ref", gameId: g.id, source: r.source, externalId: r.externalId, title: r.matchedTitle, toGameId: to },
      });
    }
  }
  return out;
}
