// 이미 있는 게임 행의 종류(content_type)를 스토어 답으로 바로잡을지 가른다.
//
// 왜 필요한가: content_type 은 행을 만들 때만 정해지고 수집이 다시 고치지 않았다. 그래서 한 번 틀린 판정이
// 영원히 남았다 — 2026-09-25 실측으로 Roblox(PS 인기 13위), 미들어스: 섀도우 오브 워, 데스루프 같은 본편이
// dlc 로 앉아 목록에서 빠져 있었고, 스토어는 그 상품들을 전부 game 이라고 답하고 있었다.
//
// 무엇만 고치나: **부모 없는 dlc 가 game 으로** 가는 한 방향뿐이다.
//   - 부모가 있는 dlc 는 둔다. 부모 잇기(planParentLinks)가 스토어가 알려 준 본편에 붙인 행이다.
//   - 에디션, 번들은 둔다. 그 종류는 스토어가 아니라 우리 제목 규칙이 정한 것이라(Xbox 는 에디션도 game 이라 답한다)
//     스토어 답으로 되돌리면 본편 밑에 묶어 둔 판이 목록으로 쏟아진다.
//   - 스토어가 종류를 **명시**했을 때만 믿는다. PlayStation 콘셉트 응답은 종류를 비워 둔다(undefined) —
//     콘셉트 번호가 곧 게임 단위라 어댑터가 따로 적지 않는다. 비어 있는 것을 game 으로 읽으면
//     본편 콘셉트 번호를 빌려 쥔 DLC 껍데기까지 본편이 된다.
import type { StoreSnapshot } from "@/server/adapters/types";
import type { GameRow } from "./game-writer";

export function correctedContentType(
  cur: Pick<GameRow, "contentType" | "parentGameId">,
  storeSays: StoreSnapshot["contentType"],
): "game" | null {
  if (storeSays !== "game") return null;
  if (cur.contentType !== "dlc" || cur.parentGameId) return null;
  return "game";
}
