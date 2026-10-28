// 내 게임 광고 걸기 뼈대 — 노출 자리 구매 판(boost-purchase)을 닮게: 좁은 폭, 제목과 설명, 상품 판(고르기 두 칸, 값, 결제 위젯).
// 이 폴더에 따로 두는 이유: 없으면 위 [id] 의 내 게임 상세 뼈대를 빌려 전혀 다른 화면이 잠깐 선다.
import { BoostPurchaseSkeleton } from "@/components/payments/boost-purchase-skeleton";

export default function Loading() {
  return <BoostPurchaseSkeleton />;
}
