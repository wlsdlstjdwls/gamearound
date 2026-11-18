// 개발 팁 목록 — 숨김(2026-11-18). 라운지 시안 C 로 넣었다가 같은 날 사용자 "맘대로 추가" 로 숨겼다(lib/community/constants 의 HIDDEN_POST_CATEGORIES).
// 주소로 들어와도 없는 화면이다. 되살릴 때는 git 의 d75ab105 판(LoungeBoard 에 categories={["tip"]})으로 되돌린다.
import { notFound } from "next/navigation";

export default function Page() {
  notFound();
}
