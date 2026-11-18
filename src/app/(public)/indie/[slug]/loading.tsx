// 인디 상세 뼈대 — 실물(components/indie/detail-hero, 2026-11-18 시안 D 개편)과 같은 자리.
//   되돌아가기, 화면 끝까지 찬 배너(BANNER_H), 배너에 겹친 정보 카드(HERO_CARD: 왼쪽 제목, 소개, 플랫폼 알약, 게임 정보 격자 /
//   오른쪽 플레이하기, 찜하기, 소식 받기), 그 아래 가운데 한 기둥(--indie-body-w)의 흰 판 하나에 구매 마디와 소개 마디가 선으로 이어진다.
// 2026-11-18 사용자 "스켈레톤도 바뀐 UI 로 적용이 안 되어 있네": 옛 뼈대는 어두운 판 + 오른쪽 320px 정보 기둥이라 실물과 달랐다.
// 이번 달 1~3위 금속 띠는 순위를 아는 서버 응답 뒤에만 서므로 뼈대에 두지 않는다 — 대부분의 게임에는 없다.
import { BANNER_H, HERO_CARD } from "@/components/indie/detail-hero";
import { sectionCardClass } from "@/components/ui/page";
import { Bone, SectionHeadSkeleton, SkeletonPage, TextLinesSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** 게임 정보 격자 칸 수(제작자, 플랫폼, 장르, 등록일 — 출시는 글에 따라 없다) */
const FACT_CELLS = 4;
/** 구매 마디 스토어 칸 수(플랫폼 둘이 가장 흔하다) */
const BUY_TILES = 2;

export default function IndieDetailLoading() {
  return (
    <SkeletonPage pad="detail" gap={24}>
      <Bone className="h-4 w-24" />

      <section className="relative">
        <Bone className={cn("full-bleed rounded-none", BANNER_H)} />
        <div className={HERO_CARD}>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Bone className="h-[32px] w-3/5 sm:h-[41px]" />
              <Bone className="h-5 w-4/5" />
            </div>
            <div className="flex gap-1.5">
              <Bone className="h-7 w-12 rounded-full" />
              <Bone className="h-7 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line-soft pt-4 sm:grid-cols-3">
              {Array.from({ length: FACT_CELLS }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Bone className="h-3 w-12" />
                  <Bone className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:border-l lg:border-line-soft lg:pl-10">
            <Bone className="h-14 w-40 rounded-[var(--radius-md)] lg:w-full" />
            <Bone className="h-11 w-full rounded-xl" />
            <Bone className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </section>

      {/* 본문은 흰 판 하나에 마디를 가는 선으로 잇는다(실물과 같다) */}
      <div className="mx-auto grid w-full max-w-[var(--indie-body-w)]">
       <div className={sectionCardClass("flex flex-col divide-y divide-line-soft p-0 sm:p-0")}>
        <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
          <SectionHeadSkeleton width="w-44" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {Array.from({ length: BUY_TILES }).map((_, i) => (
              <Bone key={i} className="h-[86px] rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 px-4 py-6 sm:px-6">
          <SectionHeadSkeleton width="w-16" />
          <TextLinesSkeleton lines={5} className="gap-3" />
        </div>
       </div>
      </div>
    </SkeletonPage>
  );
}
