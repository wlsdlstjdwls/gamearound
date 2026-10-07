// 예약 특전 화면 문구 단일 원천(규약 §2).
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

  /** review 사유. 관리자 화면에 그대로 뜬다 */
  reason: {
    noBonus: "특전을 하나도 못 뽑았어요. 글 틀이 바뀌었는지 원문을 확인해 주세요",
    noGame: (nsuids: readonly string[]) => (nsuids.length ? `게임을 못 이었어요(번호 ${nsuids.join(", ")})` : "글에 게임 번호가 없어요"),
  },

  admin: {
    title: "예약 특전",
    lead: "한국닌텐도 특전 글에서 뽑은 특전이에요. 게임을 못 이었거나 특전을 못 뽑은 글은 검토 대기로 남아요",
    empty: "아직 받은 특전 글이 없어요",
    status: { published: "공개", review: "검토 대기", hidden: "숨김" },
    gameSlug: "게임 주소(slug)",
    link: "이 게임에 잇고 공개",
    hide: "숨기기",
    publish: "공개하기",
    gameNotFound: "그 주소의 게임이 없어요",
    postNotFound: "글을 찾지 못했어요. 새로고침해 주세요",
    needGame: "먼저 게임을 이어 주세요",
    badRequest: "요청을 읽지 못했어요",
    done: "반영했어요",
    noBonusCannotPublish: "특전이 없는 글은 공개할 수 없어요",
    bonusCount: (n: number) => `특전 ${n}개`,
  },
} as const;
