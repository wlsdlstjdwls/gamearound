// 예약 특전 출처 이름(preorder_bonus_posts.source) 단일 원천. 화면이 출처마다 문구, 링크 이름을 고르고
// 수집이 그 값으로 행을 찾으니 양쪽이 같은 글자를 봐야 한다 — 클라이언트(관리자 화면)도 읽어서 lib 에 둔다.
//
// source 칸은 enum 이 아니라 text 라 새 출처를 더해도 마이그레이션이 없다(schema-preorder).
export const PREORDER_SOURCE = {
  /** 한국닌텐도 뉴스 특전 글. 게임을 이름으로 이어서 못 이으면 검토 대기로 남는다 */
  nintendoKr: "nintendo_kr",
  /** Xbox 스토어 한국 상품 소개의 특전 목록. 상품 번호로 게임에 이미 묶여 있어 바로 공개한다 */
  xboxKr: "xbox_kr",
} as const;

export type PreorderSource = (typeof PREORDER_SOURCE)[keyof typeof PREORDER_SOURCE];
