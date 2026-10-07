// 예약 특전 화면 계약. 클라이언트 컴포넌트(관리자 판정 버튼)도 읽어서 lib 에 둔다 — server 를 import 하면 번들이 깨진다.
import type { PreorderEdition, PreorderPostStatus } from "@/server/db/schema";

export type PreorderBonusDto = {
  edition: PreorderEdition;
  name: string;
  retailers: string | null;
  notes: string[];
  imageUrl: string | null;
  /** YYYY-MM-DD. 패키지판은 null(재고 소진 시까지) */
  endsOn: string | null;
};

export type PreorderPostDto = { url: string; title: string; bonuses: PreorderBonusDto[] };

export type PreorderAdminRowDto = {
  id: string;
  url: string;
  title: string;
  publishedAt: Date | null;
  status: PreorderPostStatus;
  statusReason: string | null;
  nsuids: string[];
  game: { slug: string; title: string } | null;
  bonusCount: number;
};
