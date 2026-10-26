// 브라우저 뒤로가기를 써도 되는지 — "이전 화면" 줄(components/page-trail)과 글쓰기 "취소"(community/post-form)가 같이 쓴다.
// 다른 사이트에서 바로 들어왔거나 새 탭이면 뒤가 우리 화면이 아니다. 그때 뒤로가기를 부르면 사이트 밖으로 튕겨 나가
// 고장으로 읽혀서, 부르는 쪽이 대신 갈 곳(목록, 메뉴 첫 칸)으로 보낸다. 클라이언트에서만 부른다(window, document).

/** 뒤가 같은 사이트의 화면인가. 처음 연 탭은 history.length 가 1 이고, 바깥에서 왔으면 referrer 가 다른 곳이다 */
export function canGoBack(): boolean {
  if (window.history.length <= 1) return false;
  try {
    return document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}
