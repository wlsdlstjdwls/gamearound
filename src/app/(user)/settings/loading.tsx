// 설정 뼈대 — 좁은 폭(tight), 마디 넷이 세로로 선다: 계정(이름표/값 네 줄), 개인화(이름표/값 줄),
// 알림 받기(위 굵은 선 + 한 줄 + 회색 판), 테마(위 굵은 선 + 칩 셋).
// 마디 간격 34 는 실물과 같다. 개인화 마디는 관리자에게 없지만, 대부분의 사용자에게 서는 쪽에 맞춘다.
import { ROWS } from "@/components/ui/page";
import { Bone, ChipsSkeleton, PageHeadSkeleton, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const ACCOUNT_ROWS = 4; // 닉네임, 이메일, 권한, 가입일
const PROFILE_ROWS = 4;
const THEME_CHOICES = 3; // 시스템, 밝게, 어둡게

function LabelValueRows({ rows, rowClass }: { rows: number; rowClass: string }) {
  return (
    <div className={ROWS}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex justify-between gap-4 ${rowClass}`}>
          <Bone className="h-4 w-14" />
          <Bone className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <SkeletonPage width="tight" gap={34}>
      <PageHeadSkeleton width="w-20" />

      <div className="flex flex-col gap-3.5">
        <SectionHeadSkeleton size="sub" width="w-12" action />
        <LabelValueRows rows={ACCOUNT_ROWS} rowClass="py-[13px]" />
      </div>

      <div className="flex flex-col gap-3.5">
        <SectionHeadSkeleton size="sub" width="w-24" />
        <LabelValueRows rows={PROFILE_ROWS} rowClass="py-[13px]" />
      </div>

      <div className="flex flex-col gap-3.5">
        <SectionHeadSkeleton size="sub" width="w-20" />
        <div className="flex items-center justify-between gap-3.5 border-t border-line-strong py-4">
          <div className="flex flex-col gap-1.5">
            <Bone className="h-[18px] w-52" />
            <Bone className="h-3.5 w-40" />
          </div>
          <Bone className="h-7 w-12 rounded-full" />
        </div>
        <Bone className="h-[66px] rounded-xl" />
      </div>

      <div className="flex flex-col gap-3.5">
        <SectionHeadSkeleton size="sub" width="w-12" />
        <ChipsSkeleton count={THEME_CHOICES} className="border-t border-line-strong pt-4" />
      </div>
    </SkeletonPage>
  );
}
