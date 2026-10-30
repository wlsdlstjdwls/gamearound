// 인증 UI/서버 공용 문구. 하드코딩 금지 — 문구 수정은 여기서만.
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, PASSWORD_MIN, RESET_TOKEN_TTL_MIN } from "@/lib/auth/constants";
import { SITE } from "@/lib/site";

export const AUTH_MESSAGES = {
  // 검증
  emailRequired: "이메일을 입력해 주세요",
  emailInvalid: "올바른 이메일 형식이 아니에요",
  passwordRequired: "비밀번호를 입력해 주세요",
  passwordTooShort: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요`,
  passwordTooLong: "비밀번호가 너무 길어요",
  passwordWeak: "영문, 숫자, 특수문자를 모두 넣어 주세요",
  passwordCommon: "너무 쉬운 비밀번호예요. 흔한 조합, 반복, 연속된 글자는 피해 주세요",
  passwordConfirmMismatch: "비밀번호가 서로 달라요",
  passwordHasEmail: "비밀번호에 이메일 아이디가 들어 있어요. 다른 조합으로 바꿔 주세요",
  displayNameRequired: "닉네임을 입력해 주세요",
  displayNameLength: `닉네임은 ${DISPLAY_NAME_MIN}~${DISPLAY_NAME_MAX}자로 입력해 주세요`,
  displayNameInvalid: "닉네임에는 공백 외 특수문자를 쓸 수 없어요",
  displayNameJamo: "자음이나 모음만 따로 쓸 수 없어요. 완성된 글자로 입력해 주세요",
  termsRequired: "이용약관에 동의해 주세요",
  privacyRequired: "개인정보 수집, 이용에 동의해 주세요",
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
  signUpTitle: `${SITE.name} 시작하기`,
  signInCta: "로그인",
  // 머리띠 메뉴, 로그인 팝업(M-01)의 링크, 가입 화면의 탭, 제목, 단추가 모두 이 한 낱말을 쓴다.
  // 기획서 v2.0(3.1, S-27)은 "계정 등록" 이었지만 2026-10-30 사용자 지시로 "회원가입" 으로 바꿨다 — 사람들이 찾는 낱말이 이쪽이다
  signUpCta: "회원가입",
  /** 가입 단추가 꺼져 있는 동안 단추 아래에 서는 안내(S-27 "필수 항목 미충족 시 가입 버튼 비활성") — 왜 안 눌리는지 말해 준다 */
  signUpIncomplete: "필수 항목을 모두 채우고 필수 약관에 동의하면 눌러져요",
  signOutCta: "로그아웃",
  /*
   * 동의 문구는 조각으로 둔다 — 두 문서 이름이 **눌러서 읽을 수 있는 링크**여야 해서다.
   * 한 문장으로 붙여 두었더니 읽어 보지 않고 동의하는 것 말고는 길이 없었다(2026-09-22).
   */
  termsDocLabel: "이용약관",
  privacyDocLabel: "개인정보처리방침",
  termsConsentTail: "에 동의해요.",
  // 가입 동의 넷(기획서 v2.0 S-27, 목업 regv). 필수 둘은 문서 이름을 링크로 단다
  consentAll: "전체 동의",
  consentRequired: "(필수)",
  consentOptional: "(선택)",
  privacyConsentLabel: "개인정보 수집, 이용",
  alertEmailConsent: "가격 알림 이메일을 받아요",
  pending: "확인 중…",
  displayNameTaken: "이미 쓰고 있는 닉네임이에요",
  noAccount: "아직 계정이 없나요?",
  hasAccount: "이미 계정이 있나요?",
  passwordHint: `${PASSWORD_MIN}자 이상, 영문, 숫자, 특수문자를 섞어 주세요`,
  // 비밀번호 재설정 — 요청 결과는 계정이 있든 없든 같은 문장이다(열거 방지)
  forgotLink: "비밀번호를 잊었나요?",
  forgotTitle: "비밀번호 재설정",
  forgotSubtitle: "가입한 이메일로 재설정 링크를 보내 드려요",
  forgotCta: "재설정 링크 받기",
  forgotSent: `가입된 이메일이라면 재설정 링크를 보냈어요. 메일함과 스팸함을 확인해 주세요. 링크는 ${RESET_TOKEN_TTL_MIN}분 동안만 열려요.`,
  forgotUnavailable: "지금은 메일을 보낼 수 없어요. 잠시 후 다시 시도해 주세요",
  resetSubtitle: "새로 쓸 비밀번호를 입력해 주세요",
  resetCta: "비밀번호 바꾸기",
  resetInvalid: "링크가 만료됐거나 이미 쓴 링크예요. 재설정 링크를 다시 받아 주세요",
  resetRequestAgain: "재설정 링크 다시 받기",
  resetDone: "비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요",
  newPasswordLabel: "새 비밀번호",
  newPasswordConfirmLabel: "새 비밀번호 확인",
  backToSignIn: "로그인으로 돌아가기",
  showPassword: "비밀번호 표시",
  hidePassword: "비밀번호 숨기기",
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;

/** 로그인 팝업(components/auth/login-gate, 기획서 v2.0 M-01) */
export const LOGIN_GATE_MESSAGES = {
  /**
   * 팝업 제목이 곧 가입할 이유다(2026-10-30 사용자 승인). "로그인이 필요해요" 는 벽만 말하고 얻는 것을 말하지 않았다.
   * 본문 줄을 더 세우지 않고 제목에 담는다 — 안내 한 줄(lead)은 같은 날 걷었다(줄이 늘면 폼이 밀린다)
   */
  title: "로그인하면 할인 소식을 알려 드려요",
} as const;

/** 인증 화면 왼쪽 예시 알림 카드(components/auth/auth-showcase). 실제 게임 이름과 값을 쓰지 않는다 — 그림이 진짜 소식처럼 읽히면 안 된다 */
export const AUTH_SHOWCASE_MESSAGES = {
  title: "찜한 게임이 할인을 시작했어요",
  pct: "-30%",
  body: "지금 확인해 보세요",
} as const;
