// 설정 뼈대 — 좁은 폭(tight), 마디 넷이 세로로 선다: 계정(이름표/값 네 줄 + 안내 한 줄), 개인화(설명 + 단추),
// 알림 받기(위 굵은 선 + 한 줄 + 회색 판), 테마(위 굵은 선 + 칩 셋).
// 마디 간격 34 는 실물과 같다. 개인화는 답하기 전 모양(설명 한 줄과 "지금 답하기")으로 그린다 — 가입한 사람은 모두
// 거기서 시작하고, 답한 뒤의 값 줄로 그렸더니(2026-10-08 캡처 비교) 그 마디만 150px 넘게 길었다.
import { ROWS } from "@/components/ui/page";
import { Bone, ChipsSkeleton, PageHeadSkeleton, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const ACCOUNT_ROWS = 4; // 닉네임, 이메일, 권한, 가입일
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
        {/* 줄 높이 47 은 실물 실측(값 글자가 굵은 14px 라 이름표 줄보다 높다) */}
        <LabelValueRows rows={ACCOUNT_ROWS} rowClass="py-[15px]" />
        <Bone className="h-3.5 w-48" />
      </div>

      <div className="flex flex-col gap-3.5">
        <SectionHeadSkeleton size="sub" width="w-16" />
        <Bone className="h-4 w-[340px] max-w-full" />
        <Bone className="h-9 w-[86px] rounded-[9px]" />
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
