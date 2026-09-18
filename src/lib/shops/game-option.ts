// 게임 후보 한 줄의 모양 — 서버 액션이 돌려주고 클라이언트 폼이 읽는다.
//
// 왜 서비스 파일이 아니라 여기인가: `services/shop-games` 는 `import "server-only"` 라
// 클라이언트 컴포넌트가 타입만 가져가려 해도 그 파일을 가리키게 된다. 타입은 지워지지만
// 경로가 남아 읽는 사람이 "이 폼이 서버 모듈을 본다" 고 오해한다. 계약만 여기 둔다.
import type { ContentType, GameVisibility } from "@/server/db/schema";

/** 상품 폼의 게임 후보 한 줄. 같은 제목이 여럿일 때 배급사와 갈래로 가른다 */
export type ShopGameOptionDto = {
  id: string;
  titleKo: string | null;
  titleEn: string;
  publisher: string | null;
  contentType: ContentType;
  visibility: GameVisibility;
};
