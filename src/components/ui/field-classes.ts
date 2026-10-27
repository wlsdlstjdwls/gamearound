// 여러 줄 칸(textarea)의 이름표, 도움말 글자. TextField 를 못 쓰는 칸들(인디 글 소개, 플레이테스트 안내, 신청 한마디)이 같이 쓴다.
// "use client" 파일(text-field)에 두지 않는 이유: 서버 컴포넌트가 읽으면 문자열 대신 클라이언트 참조가 온다(AGENTS 6장).
export const FIELD_LABEL_CLASS = "text-[12.5px] font-medium text-mut";
export const FIELD_HINT_CLASS = "text-[12.5px] leading-[1.6] text-dim";
