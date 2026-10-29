// 카드 하트의 찜 여부 저장소 — 같은 틱에 마운트된 카드들의 slug 를 모아 한 번에 묻는다.
//
// 스토어 게임 하트와 인디 게임 하트(2026-10-29)가 같은 모양으로 쓴다. 찜이 담기는 표가 달라(wishlists, indie_post_likes)
// 묻는 액션만 갈래마다 다르고, 모으기, 기억, 구독은 한 벌이다. 목록 한 쪽이 24장이라 카드마다 서버 액션을 부르면
// Neon 왕복이 24번 줄을 선다(왕복 1회 약 220ms) — 그래서 모은다.
// "use client" 를 붙이지 않는다: 값이 아니라 함수만 내보내고, 부르는 쪽(wish-heart)이 이미 클라이언트다.

export type WishStore = {
  /** 이미 물어본 slug 의 답. 없으면 아직 모른다 */
  get(slug: string): boolean | undefined;
  set(slug: string, on: boolean): void;
  request(slug: string): void;
  subscribe(l: () => void): () => void;
  /** 답이 바뀔 때마다 오른다 — 구독한 하트가 다시 읽을 신호 */
  version(): number;
  size(): number;
  /** 로그아웃하면 남의 하트가 남지 않게 비운다 */
  forget(): void;
};

export function createWishStore(ask: (slugs: string[]) => Promise<string[]>): WishStore {
  // 화면을 옮겨도 남아 있어 같은 카드를 다시 묻지 않는다
  const known = new Map<string, boolean>();
  let queue = new Set<string>();
  let scheduled = false;
  const listeners = new Set<() => void>();
  let version = 0;

  const emit = () => {
    version += 1;
    for (const l of listeners) l();
  };

  return {
    get: (slug) => known.get(slug),
    set(slug, on) {
      known.set(slug, on);
      emit();
    },
    request(slug) {
      if (known.has(slug) || queue.has(slug)) return;
      queue.add(slug);
      if (scheduled) return;
      scheduled = true;
      // 같은 렌더에서 마운트된 카드를 다 모은 뒤 한 번에 묻는다
      queueMicrotask(() => {
        const slugs = [...queue];
        queue = new Set();
        scheduled = false;
        ask(slugs)
          .then((wished) => {
            const on = new Set(wished);
            for (const s of slugs) known.set(s, on.has(s));
            emit();
          })
          .catch(() => {});
      });
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    version: () => version,
    size: () => known.size,
    forget() {
      known.clear();
      emit();
    },
  };
}
