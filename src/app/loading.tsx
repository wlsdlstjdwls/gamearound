// 루트 로딩 — 제 뼈대가 없는 곳의 폴백. 무난한 제목 한 줄과 문단 몇 줄만 세운다.
//
// 여기 오는 경우: 로그인, 가입, 온보딩처럼 폼 하나라 거의 바로 뜨는 화면과, (user) 레이아웃이 로그인 확인을
// await 하는 동안. 예전엔 여기가 홈 카드 격자였는데(2026-10-08 까지) 그 탓에 뼈대 없는 화면이 전부 홈 모양을 띄웠다.
// 홈 뼈대는 (public)/loading 으로 옮겼고, 이 폴백은 어느 화면 앞에 떠도 "다른 화면" 으로 읽히지 않을 만큼만 그린다.
import { PageHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";

const LINES = 4;

export default function RootLoading() {
  return (
    <SkeletonPage width="tight" gap={20}>
      <PageHeadSkeleton width="w-40" />
      <TextLinesSkeleton lines={LINES} />
    </SkeletonPage>
  );
}
