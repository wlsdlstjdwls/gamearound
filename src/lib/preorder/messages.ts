// 예약 특전 화면 문구 단일 원천(규약 §2). 관리자 화면 문구는 lib/admin/messages/preorder.ts 에 둔다.
export const PREORDER_MESSAGES = {
  title: "예약 특전",
  lead: "판매처마다 주는 특전이 달라요",
  edition: { package: "패키지", download: "다운로드" },
  retailers: "받는 곳",
  endsOn: (date: string) => `${date}까지`,
  untilStock: "재고 소진 시까지",
  source: "출처: 한국닌텐도",
  sourceLink: "원문 보기",
  newTab: "(새 창에서 열림)",
  imageAlt: (name: string) => `${name} 특전 이미지`,
} as const;
