// 사전예약 판정 — 스토어 판 하나가 "출시 전인데 지금 살 수 있는가".
//
// 스토어마다 따로 받는 예약 신호(닌텐도 sales_status, Xbox IsPreOrder)를 쓰지 않고 이미 가진 두 사실로 정하는 이유:
// - 스토어는 출시 전 상품에 **살 수 있을 때만** 값을 준다. 스팀은 예약을 안 열면 값이 0 으로 오고(2026-10-06 실측
//   출시 전 스팀 행 499건 중 0원 217건, 값 없음 253건), 닌텐도 가격 API 는 onsale, preorder 에만 값을 준다.
// - 그래서 "출시일이 오늘 뒤 + 값이 0 보다 큼" 이 곧 예약 구매가 열렸다는 스토어의 말이다. 우리가 어림하는 게 아니다.
//   운영 표본(스팀 29, PS 42, Xbox 40, Epic 34건)을 눈으로 봤다 — GTA VI, Fable 처럼 전부 실제 예약 상품이었다.
// - 신호 칸을 따로 두면 출시 뒤 다음 수집 때까지 배지가 남는다. 날짜로 견주면 출시일이 지나는 순간 스스로 꺼진다.
// - 수집 요청도 컬럼도 늘지 않는다. 출시일을 주는 스토어는 모두 바로 덮인다(닌텐도는 아직 미래 출시일 행이 0건이다).
//
// 0원을 빼는 이유: 출시 전 무료 게임은 "예약" 할 것이 없고, 스팀이 아직 값을 안 정한 상품도 0 으로 온다.
// 오늘 출시하는 판은 예약이 아니다(오늘부터 그냥 판다) — 그래서 "오늘보다 뒤" 만 센다.
import { kstDateKey } from "@/lib/format";

type PreorderInput = { releaseDate: string | null; currentPrice: number | null };

/**
 * today 는 KST 날짜 열쇠("YYYY-MM-DD"). 부르는 쪽이 한 번 만들어 여러 판에 나눠 쓰고, 테스트는 고정값을 넣는다.
 * 날짜 칸은 같은 꼴의 글자라 글자 비교가 곧 날짜 비교다.
 */
export function isPreorder(p: PreorderInput, today: string = kstDateKey(new Date())): boolean {
  if (!p.releaseDate || p.currentPrice === null || p.currentPrice <= 0) return false;
  return p.releaseDate.slice(0, 10) > today;
}
