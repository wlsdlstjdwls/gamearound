// 개편 1단계의 자리표시(components/coming-soon). 화면이 생기면 이 파일을 갈아엎는다.
import { ComingSoon, comingSoonMetadata } from "@/components/coming-soon";
import { ROUTES } from "@/lib/routes";

export const metadata = comingSoonMetadata(ROUTES.board);

export default function Page() {
  return <ComingSoon href={ROUTES.board} />;
}
