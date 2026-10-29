// 찜 목록의 인디 게임 칸(2026-10-29, 사용자 "찜하면 찜목록은 어디서 봄? 찜목록에서는 안보이던데").
//
// 인디 찜은 스토어 게임 찜과 다른 표에 담겨(server/services/indie/wishes 머리 주석) 예전 찜 목록이 읽지 않았다.
// 한 줄로 섞지 않고 칸을 나눈다: 인디 게임에는 가격, 할인이 없어 "할인순" 정렬과 할인 알림 단추가 뜻이 없다.
// 카드는 인디 목록과 같은 IndieCard 다 — 하트를 누르면 그 자리에서 풀리고, 다음에 이 화면을 열면 빠진다(카드가 갑자기 사라지면 실수로 누른 것을 되돌릴 길이 없다).
import { EmptyState } from "@/components/empty-state";
import { IndieCard } from "@/components/indie/indie-card";
import { SectionHead } from "@/components/ui/page";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import type { IndieCardDto } from "@/lib/indie/dto";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { WISHLIST_MESSAGES as M } from "@/lib/wishlist/messages";

export function IndieWishes({ items }: { items: IndieCardDto[] }) {
  return (
    <section aria-labelledby="wish-indie" className="flex flex-col gap-4">
      <SectionHead id="wish-indie" title={M.indieSection} note={items.length > 0 ? `${items.length}개` : undefined} size="sub" />
      {items.length === 0 ? (
        <EmptyState title={M.indieEmptyTitle} description={M.indieEmptyDescription} action={{ href: ROUTES.indie, label: M.indieEmptyAction }} />
      ) : (
        <ul className={HOME_GRID_CLASS}>
          {items.map((post, i) => (
            <li key={post.slug} className="enter-item" style={stagger(i)}>
              <IndieCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
