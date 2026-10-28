// "요즘 많이 찾는 장르" 를 고르는 순수 계산. 최근 7일 게임 조회 횟수를 그 게임의 장르마다 더해 큰 순서로 세운다.
//
// 조회가 적을 때(오픈 직후, Redis 장애) 몇 번의 클릭으로 칩이 요동치면 "요즘 많이 찾는" 이 거짓말이 된다.
// 그래서 합이 POPULAR_GENRE_MIN_VIEWS 보다 작은 장르는 순위에 넣지 않고, 빈자리는 게임 수 순서(fallback)로 채운다.

/** 장르 하나가 조회 순위에 들려면 넘어야 할 7일 조회 합. 한 사람이 몇 번 눌러 칩을 바꾸지 못할 만큼 */
export const POPULAR_GENRE_MIN_VIEWS = 20;

export function rankGenresByViews(
  slugGenres: readonly { slug: string; genre: string }[],
  counts: ReadonlyMap<string, number>,
  fallback: readonly string[],
  limit: number,
): string[] {
  const allowed = new Set(fallback);
  const sums = new Map<string, number>();
  for (const { slug, genre } of slugGenres) {
    if (!allowed.has(genre)) continue;
    sums.set(genre, (sums.get(genre) ?? 0) + (counts.get(slug) ?? 0));
  }
  const byViews = [...sums]
    .filter(([, v]) => v >= POPULAR_GENRE_MIN_VIEWS)
    .sort((a, b) => b[1] - a[1] || fallback.indexOf(a[0]) - fallback.indexOf(b[0]))
    .map(([g]) => g);
  const picked = byViews.slice(0, limit);
  for (const g of fallback) {
    if (picked.length >= limit) break;
    if (!picked.includes(g)) picked.push(g);
  }
  return picked;
}
