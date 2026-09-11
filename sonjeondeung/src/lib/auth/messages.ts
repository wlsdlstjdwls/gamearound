// 인증 UI/서버 공용 문구. 하드코딩 금지 — 문구 수정은 여기서만.
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, PASSWORD_MIN } from "@/lib/auth/constants";

export const AUTH_MESSAGES = {
  // 검증
  emailRequired: "이메일을 입력해 주세요",
  emailInvalid: "올바른 이메일 형식이 아니에요",
  passwordRequired: "비밀번호를 입력해 주세요",
  passwordTooShort: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요`,
  passwordTooLong: "비밀번호가 너무 길어요",
  passwordWeak: "영문과 숫자를 함께 넣어 주세요",
  passwordConfirmMismatch: "비밀번호가 서로 달라요",
  displayNameRequired: "닉네임을 입력해 주세요",
  displayNameLength: `닉네임은 ${DISPLAY_NAME_MIN}~${DISPLAY_NAME_MAX}자로 입력해 주세요`,
  displayNameInvalid: "닉네임에는 공백 외 특수문자를 쓸 수 없어요",
  termsRequired: "이용약관에 동의해 주세요",
  // 결과 — 계정 존재 여부를 드러내지 않는다(열거 방지)
  invalidCredentials: "이메일 또는 비밀번호가 올바르지 않아요",
  emailTaken: "이미 가입된 이메일이에요. 로그인해 주세요",
  tooManyAttempts: "시도가 너무 많아요. 잠시 후 다시 시도해 주세요",
  serverError: "잠시 문제가 생겼어요. 다시 시도해 주세요",
  loginRequired: "로그인이 필요합니다",
  forbidden: "권한이 없습니다",
  signedOut: "로그아웃했어요",
  // UI 라벨
  signInTitle: "다시 만나서 반가워요",
  signInSubtitle: "찜한 게임의 할인 소식을 놓치지 마세요",
  signUpTitle: "손전등 시작하기",
  signUpSubtitle: "가격 알림과 위시리스트를 무료로 이용하세요",
  signInCta: "로그인",
  signUpCta: "가입하기",
  signOutCta: "로그아웃",
  pending: "확인 중…",
  noAccount: "아직 계정이 없나요?",
  hasAccount: "이미 계정이 있나요?",
  passwordHint: `${PASSWORD_MIN}자 이상, 영문과 숫자 포함`,
  showPassword: "비밀번호 표시",
  hidePassword: "비밀번호 숨기기",
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
