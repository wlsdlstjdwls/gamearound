// 개인화 취향 서비스 — 온보딩이 쓰고, 목록/홈/알림이 읽는다. 설계는
// docs/기획_첫로그인_온보딩_개인화_2026-09-22.md.
//
// route 는 여기로만 들어온다(규약 §1). Drizzle 행을 화면까지 흘리지 않는다.
import { cache } from "react";
import { and, asc, eq, exists, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { gameGenres, gamePlatforms, games, genres, subscriptions, userProfiles, type DealStyle, type PlayTimeStyle, type Platform, type Role } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { GENRE_CHOICE_NAMES } from "@/lib/onboarding/constants";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import { dealFloor } from "@/lib/onboarding/personal";
import { personalQuery } from "@/lib/onboarding/query";
import { PLATFORM_LABEL } from "@/lib/format";
import type { GamesQuery } from "@/lib/games-query";
import { getPersonalDeals, type GameSummary } from "@/server/services/games";

/** 화면이 받는 취향 한 벌 */
export type ProfileDto = {
  platforms: Platform[] | null;
  favoriteGenreIds: number[] | null;
  dealStyle: DealStyle | null;
  playTimeStyle: PlayTimeStyle | null;
  subscriptionKeys: string[] | null;
  /** null 이면 개인화를 쓰지 않는다 — 값이 남아 있어도 읽는 쪽이 무시해야 한다 */
  consentedAt: Date | null;
  onboardingStep: OnboardingStep | null;
  onboardingDoneAt: Date | null;
};

const EMPTY: ProfileDto = {
  platforms: null,
  favoriteGenreIds: null,
  dealStyle: null,
  playTimeStyle: null,
  subscriptionKeys: null,
  consentedAt: null,
  onboardingStep: null,
  onboardingDoneAt: null,
};

function toDto(r: typeof userProfiles.$inferSelect): ProfileDto {
  return {
    platforms: r.platforms as Platform[] | null,
    favoriteGenreIds: r.favoriteGenreIds,
    dealStyle: r.dealStyle,
    playTimeStyle: r.playTimeStyle,
    subscriptionKeys: r.subscriptionKeys,
    consentedAt: r.personalizationConsentAt,
    onboardingStep: (r.onboardingStep as OnboardingStep | null) ?? null,
    onboardingDoneAt: r.onboardingDoneAt,
  };
}

/**
 * 내 취향. 행이 없으면 빈 값을 돌려준다 — 없는 것과 비어 있는 것을 화면이 가를 필요가 없다.
 * 행을 미리 만들지 않는 이유는 schema 의 userProfiles 주석에 있다.
 */
export const getMyProfile = cache(async (): Promise<ProfileDto> => {
  const u = await requireUser();
  const [row] = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, u.id)).limit(1);
  return row ? toDto(row) : EMPTY;
});

/**
 * 온보딩을 보여 줄 사람인가. **일반 사용자만** 본다(사용자 요청 2026-09-22).
 *
 * 나머지 셋은 화면을 제 취향으로 맞춰 쓰는 계정이 아니라 남의 데이터를 다루는 계정이다 —
 * 관리자는 검수하고, 게임사와 매장은 제 상품을 올린다. 목록과 홈이 취향으로 걸러지면
 * **보려던 것이 오히려 안 보인다**.
 *
 * 화이트리스트로 적은 이유: role 이 늘어날 때 기본값이 "안 보여 준다" 여야 한다.
 * `!== "admin"` 으로 두면 새 역할이 생기는 날 아무도 모르게 온보딩을 만난다.
 *
 * 판단을 한 함수로 뽑아 둔 이유는 물어보는 자리가 둘 이상이기 때문이다(온보딩 입구, 인증 리다이렉트).
 * 설정 화면의 개인화 마디도 이 판단을 따른다(5회차) — 답하는 길이 온보딩 단계뿐이라
 * 마디를 보여 주면 누르는 순간 온보딩 레이아웃에 막혀 홈으로 튕긴다.
 */
export function isOnboardingAudience(role: Role): boolean {
  return role === "user";
}

/**
 * 개인화가 실제로 켜져 있나. 읽는 쪽(목록, 홈)은 이 함수만 보면 된다 —
 * "동의했는가" 와 "값이 있는가" 를 각자 판단하면 언젠가 한쪽이 빠진다.
 */
export function isPersonalized(p: ProfileDto): boolean {
  return p.consentedAt !== null;
}

type ProfilePatch = Partial<Omit<ProfileDto, "consentedAt" | "onboardingDoneAt">>;

/**
 * 한 단계의 답을 저장한다. 행이 없으면 만들고 있으면 덮는다.
 *
 * onDuplicateKeyUpdate 가 아니라 onConflictDoUpdate 를 쓰는 이유는 Postgres 라서다.
 * `set` 에 넣은 칸만 덮는다 — 단계마다 제 칸만 건드리므로 앞 단계 답이 지워지지 않는다.
 */
export async function saveStep(patch: ProfilePatch & { onboardingStep?: OnboardingStep }): Promise<void> {
  const u = await requireUser();
  const db = getDb();
  const values = {
    userId: u.id,
    ...patch,
    ...createdBy("user", u.id),
    ...updatedBy("user", u.id),
  };
  await db
    .insert(userProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...patch, ...updatedBy("user", u.id) },
    });
}

/** 개인화 동의. 시각을 남기는 것이 곧 "켜짐" 이다 */
export async function grantConsent(): Promise<void> {
  const u = await requireUser();
  const db = getDb();
  const now = new Date();
  await db
    .insert(userProfiles)
    .values({
      userId: u.id,
      personalizationConsentAt: now,
      onboardingStep: "platforms",
      ...createdBy("user", u.id),
      ...updatedBy("user", u.id),
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { personalizationConsentAt: now, onboardingStep: "platforms", ...updatedBy("user", u.id) },
    });
}

/**
 * 동의 철회. **값 삭제와 한 트랜잭션이다**(설계 §5) — 둘이 따로 놀면 "껐는데 남아 있다" 가 된다.
 * 행 자체는 남긴다. 지우면 다시 켤 때 "처음 동의" 로 보여 동의 이력이 끊긴다.
 */
export async function revokeConsent(): Promise<void> {
  const u = await requireUser();
  await getDb()
    .update(userProfiles)
    .set({
      personalizationConsentAt: null,
      platforms: null,
      favoriteGenreIds: null,
      dealStyle: null,
      playTimeStyle: null,
      subscriptionKeys: null,
      onboardingStep: null,
      onboardingDoneAt: null,
      ...updatedBy("user", u.id),
    })
    .where(eq(userProfiles.userId, u.id));
}

export async function finishOnboarding(): Promise<void> {
  const u = await requireUser();
  await getDb()
    .update(userProfiles)
    .set({ onboardingDoneAt: new Date(), onboardingStep: "done", ...updatedBy("user", u.id) })
    .where(eq(userProfiles.userId, u.id));
}

export type GenreChoice = { id: number; name: string };

/**
 * 장르 카드에 올릴 목록. 이름 화이트리스트(GENRE_CHOICE_NAMES)로 거르고 **그 순서 그대로** 돌려준다 —
 * DB 의 id 순, 이름 순은 사람이 고르는 순서와 아무 상관이 없다.
 * 카탈로그에 없는 이름은 조용히 빠진다(화이트리스트가 카탈로그보다 앞서 갈 수 있다).
 */
export const listGenreChoices = cache(async (): Promise<GenreChoice[]> => {
  const rows = await getDb()
    .select({ id: genres.id, name: genres.name })
    .from(genres)
    .where(inArray(genres.name, [...GENRE_CHOICE_NAMES]))
    .orderBy(asc(genres.id));
  const byName = new Map(rows.map((r) => [r.name, r]));
  return GENRE_CHOICE_NAMES.map((n) => byName.get(n)).filter((r): r is GenreChoice => Boolean(r));
});

export type SubscriptionChoice = { key: string; label: string };

/**
 * 구독 선택지. 카탈로그에 실제로 등록된 구독만 보여 준다 — 우리가 포함 여부를 모르는 구독을
 * 고르게 하면 "골랐는데 아무것도 안 걸러진다" 가 된다.
 */
export const listSubscriptionChoices = cache(async (): Promise<SubscriptionChoice[]> => {
  const rows = await getDb()
    .select({ key: subscriptions.key, label: subscriptions.labelKo })
    .from(subscriptions)
    .orderBy(asc(subscriptions.id));
  return rows;
});

/**
 * 결과 화면의 숫자 — "지금 조건에 맞는 게임 N개".
 *
 * 왜 대충 세면 안 되나: 이 숫자가 방금 1분을 쓴 사람이 받는 유일한 보답이다. 목록이 실제로
 * 그 수를 보여 주지 않으면 첫 화면에서 바로 들통난다. 그래서 **목록과 같은 조건**으로 센다 —
 * 본편만(content_type='game'), 숨김 지역 제외는 목록 질의가 이미 하는 일이라 여기서는
 * 플랫폼과 장르만 얹는다.
 *
 * 조건이 하나도 없으면(전부 건너뛴 사람) 카탈로그 전체 수가 나온다. 그것도 사실이라 그대로 둔다.
 */
export async function countPersonalizedGames(p: ProfileDto): Promise<number> {
  const db = getDb();
  const wheres = [eq(games.contentType, "game")];

  if (p.platforms && p.platforms.length > 0) {
    wheres.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(gamePlatforms)
          .where(and(eq(gamePlatforms.gameId, games.id), inArray(gamePlatforms.platform, p.platforms))),
      ),
    );
  }
  if (p.favoriteGenreIds && p.favoriteGenreIds.length > 0) {
    wheres.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(gameGenres)
          .where(and(eq(gameGenres.gameId, games.id), inArray(gameGenres.genreId, p.favoriteGenreIds))),
      ),
    );
  }

  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(games).where(and(...wheres));
  return row?.n ?? 0;
}

/**
 * 개인화한 홈 "지금 할인 중" 줄. 개인화를 안 켰으면 null — 화면은 서버가 그린 공통 줄을 그대로 둔다.
 * 취향 칸이 없거나 모자라면 공통 줄로 채워 오므로(games/personal), 켠 사람의 줄은 비지 않는다.
 */
export async function getMyHomeDeals(): Promise<GameSummary[] | null> {
  const p = await getMyProfile();
  if (!isPersonalized(p)) return null;
  return getPersonalDeals({ platforms: p.platforms, genreIds: p.favoriteGenreIds, subscriptionKeys: p.subscriptionKeys, floor: dealFloor(p.dealStyle) });
}

/** 목록에 먼저 걸 취향 조건과, 화면이 "무엇으로 걸렀는지" 를 말할 이름들 */
export type ListPreset = { query: GamesQuery; labels: string[] };

/**
 * 게임 목록의 개인화 기본 조건. 걸 것이 없으면 null — 목록은 지금처럼 전체를 보여 준다.
 *
 * null 인 경우: 비로그인, 온보딩을 안 보는 계정(관리자 등, isOnboardingAudience 주석), 개인화 끔,
 * 플랫폼도 장르도 안 고름. 비로그인을 throw 가 아니라 null 로 받는 이유는 목록이 공개 화면이라서다.
 *
 * 조건은 결과 화면의 "내 조건으로 보기" 와 같은 personalQuery 를 쓴다 — 두 자리가 다르면 같은 사람이
 * 두 갈래 목록을 본다. 할인 성향과 구독은 싣지 않는다: 목록을 할인 중인 게임만으로 줄이면 "목록" 이 아니다.
 */
export async function getMyListPreset(): Promise<ListPreset | null> {
  const u = await getCurrentUser();
  if (!u || !isOnboardingAudience(u.role)) return null;
  const p = await getMyProfile();
  if (!isPersonalized(p) || (!p.platforms?.length && !p.favoriteGenreIds?.length)) return null;

  const genreChoices = p.favoriteGenreIds?.length ? await listGenreChoices() : [];
  const genreNames = (p.favoriteGenreIds ?? []).map((id) => genreChoices.find((g) => g.id === id)?.name).filter((n): n is string => Boolean(n));
  const query = personalQuery({ platforms: p.platforms, genreNames });
  if (!query.platform && !query.genre) return null;

  const labels = [...(p.platforms ?? []).map((v) => PLATFORM_LABEL[v] ?? v), ...(query.genre ? [query.genre] : [])];
  return { query, labels };
}
