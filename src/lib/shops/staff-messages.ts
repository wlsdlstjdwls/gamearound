// 직원 계정 화면의 사용자 문구 — 설계서 §9. 문체는 "-해요"(AGENTS §6).
//
// 판매 목록 문구(listing-messages)와 가른 이유: 저쪽은 물건이고 이쪽은 사람이다.
// 한 파일에 두면 곧 300줄을 넘고, 고칠 때 엉뚱한 화면의 문장을 읽게 된다.

export const STAFF_MESSAGES = {
  title: "직원",
  lead: "함께 매장을 관리할 사람이에요. 누가 무엇을 고쳤는지는 사람마다 따로 남아요.",
  openStaff: "직원",
  openListings: "판매 목록",
  membersTitle: "함께하는 사람",
  invitesTitle: "보낸 초대",
  invitesEmpty: "기다리는 초대가 없어요.",
  you: "나",
  remove: "내보내기",
  removed: "내보냈어요.",
  revoke: "초대 취소",
  revoked: "초대를 취소했어요.",
  expiresPrefix: "만료",
  expired: "만료됨",

  inviteTitle: "직원 초대",
  inviteLead: "초대 링크를 만들어 메신저로 전해 주세요. 받는 사람은 이 이메일 계정으로 로그인해야 합류할 수 있어요.",
  emailLabel: "이메일",
  roleLabel: "역할",
  submit: "초대 링크 만들기",
  created: "초대 링크를 만들었어요. 지금만 보이니 바로 복사해 전해 주세요.",
  copy: "링크 복사",
  copied: "복사했어요.",
  ownerOnly: "초대와 내보내기는 대표만 할 수 있어요.",

  acceptTitle: "매장 직원 초대",
  acceptLead: "아래 매장에서 함께 일하자는 초대가 왔어요.",
  acceptShop: "매장",
  acceptRole: "역할",
  acceptEmail: "받는 이메일",
  accept: "합류하기",
  acceptMismatch: "초대받은 이메일과 로그인한 계정이 달라요. 초대받은 계정으로 다시 로그인해 주세요.",
  acceptExpired: "만료된 초대예요. 매장에 새 링크를 부탁해 주세요.",
  acceptUsed: "이미 사용한 초대예요.",
  acceptNotFound: "찾을 수 없는 초대예요. 링크를 다시 확인해 주세요.",
  alreadyMember: "이미 이 매장의 직원이에요.",

  emailInvalid: "이메일 주소를 다시 확인해 주세요.",
  roleInvalid: "역할을 다시 골라 주세요.",
  duplicateInvite: "이 이메일로 보낸 초대가 아직 살아 있어요. 먼저 취소하고 다시 만들어 주세요.",
  cannotRemoveOwner: "대표는 내보낼 수 없어요.",
  cannotRemoveSelf: "나 자신은 내보낼 수 없어요.",
  notFound: "그 사람을 찾을 수 없어요.",
  badRequest: "잘못된 요청이에요.",
} as const;
