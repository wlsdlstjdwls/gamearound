// 관리자 폼의 입력칸 한 겹. 정정, 별칭, 업그레이드, 수동 매핑 네 폼이 같은 칸을 쓴다.
//
// 뽑아낸 이유(AGENTS §3): 같은 선언이 네 파일에 글자 그대로 복제돼 있었다. 그리고 그 넷이 전부
// `h-8 text-[12.5px]` 였다 — 손가락으로는 32px 을 정확히 누르기 어렵고, 16px 미만 글자는
// iOS 가 포커스하는 순간 화면을 확대한다. 확대된 화면은 스스로 돌아오지 않아서,
// 관리자가 칸 하나를 고칠 때마다 두 손가락으로 화면을 되돌려야 했다(AGENTS §6).
//
// 좁은 화면에서만 키운다. 마우스 화면의 조밀함은 이 화면들의 값이다 — 정정 폼은 한 줄에
// 칸 넷이 서는 자리라 거기서 44px 을 쓰면 폼 하나가 화면 반을 먹는다.
export const ADMIN_FIELD =
  "h-11 w-full rounded-[9px] border border-line-strong bg-bg px-3 text-[16px] text-ink outline-none transition-colors focus:border-ink focus:bg-surface sm:h-8 sm:text-[12.5px]";
