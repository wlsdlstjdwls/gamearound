// DB 가 안 열렸을 때 결과 자리에 세우는 안내(lib/db-errors 의 nullIfDbUnavailable 이 null 을 준 자리).
// 화면 전체를 오류 화면으로 넘기지 않는다 — 머리글, 필터, 검색창은 살아 있어야 다른 곳으로 갈 수 있다.
import { EmptyState } from "@/components/empty-state";
import { MAINTENANCE_MESSAGES as M } from "@/lib/messages";

export function DbUnavailable({ retryHref }: { retryHref: string }) {
  return <EmptyState title={M.readTitle} description={M.readBody} action={{ href: retryHref, label: M.retry }} />;
}
