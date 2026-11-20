// 전역 404 — notFound() 및 존재하지 않는 경로.
// 장애 판(ui/status-panel)과 같은 자리 잡기, 그림만 "훑는 손전등" 이다(graphic="search") — 깜빡이면 사이트가 고장 난 것으로 읽힌다.
// 단추 셋: 다시 찾을 길(검색), 큰 목록(게임), 처음(홈). 검색이 첫째인 이유는 잘못 들어온 사람 대부분이 게임 하나를 찾던 중이라서다.
// 모양은 둘뿐이다 — 검색만 채운 단추, 나머지 둘은 같은 테두리 단추(2026-11-20 점검: 채움, 테두리, 글자 셋이 제각각이라 위계가 안 읽혔다).
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { StatusPanel } from "@/components/ui/status-panel";
import { NOT_FOUND_MESSAGES as M } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <Page>
      <StatusPanel
        size="page"
        graphic="search"
        code={M.code}
        title={M.title}
        body={M.body}
        actions={
          <>
            <Link href={ROUTES.search} className={buttonClass()}>
              {M.search}
            </Link>
            <Link href={ROUTES.game} className={buttonClass({ variant: "secondary" })}>
              {M.games}
            </Link>
            <Link href={ROUTES.home} className={buttonClass({ variant: "secondary" })}>
              {M.home}
            </Link>
          </>
        }
      />
    </Page>
  );
}
