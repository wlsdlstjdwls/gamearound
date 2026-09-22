"use client";
// 좁은 화면의 필터 껍데기 — 단추 한 줄 + 바닥에서 올라오는 시트.
//
// **접는 서랍(details)에서 시트로 바꿨다**(2026-09-22, 사용자 지적: "모바일 게임목록 필터 부분
// ui 개판이야"). 서랍이 안고 있던 문제는 넷이었고 넷 다 "기둥을 화면 폭에 그대로 편" 데서 나왔다.
//   1) 펴면 무리 넷이 세로로 쌓여 400px 을 먹었다 — 고르는 동안 게임이 한 장도 안 보였고,
//      접으면 그 400px 이 통째로 사라져 화면이 위아래로 크게 튀었다.
//   2) 걸린 조건 띠가 서랍 **아래**에 있어, 펴는 순간 띠가 화면 밖으로 밀려났다.
//      무엇이 걸렸는지 안 보이는 채로 조건을 고치게 된다.
//   3) 232px 기둥용 칸(h-9, 12.5px)이 폭만 화면만큼 늘어나 "폭은 큰데 높이는 낮은" 상자가 됐다.
//   4) 닫는 자리가 맨 위 단추뿐이라, 다 고르고 나면 400px 을 도로 올라가야 했다.
// 시트는 넷을 한 번에 지운다: 뒤 화면을 밀지 않고(막 위에 뜬다), 띠는 제자리에 남고,
// 판이 곧 손가락용 화면이라 칸을 키울 수 있고, 바닥에 "결과 보기" 를 둘 수 있다.
//
// 시트를 스스로 열게 두지 않고 open 을 쥐는 이유: 바닥 단추로도 닫아야 하는데,
// 그 단추는 children 안에 있어 시트의 내부 닫기 함수에 닿지 못한다.
//
// 조건을 고르면 시트는 **열린 채로** 둔다. 주소만 바뀌는 이동이라 ui/sheet 의 경로 감시가 닫지 않고,
// 그게 맞다 — 뒤는 막에 가려 있어 닫아 봐야 결과가 바로 보이지도 않고, 조건은 대개 둘 이상 고른다.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { GAMES_FILTER_MESSAGES } from "@/lib/games/messages";

export function MobileFilters({ groups, strip }: { groups: React.ReactNode; strip: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // min-w-0: 격자 칸의 기본 최소 크기는 auto 라 안쪽 띠의 min-content 가 칸을 밀어낸다.
  // 띠는 제 안에서 가로 스크롤하는데도(overflow-x-auto) 그 폭이 밖으로 새어 나가,
  // 조건이 넷쯤 걸리면 **화면 전체에 가로 스크롤**이 생기고 카드가 오른쪽에서 잘렸다(2026-09-22 실측 315 대 382).
  return (
    <div className="flex min-w-0 flex-col border-b border-line pb-2.5 lg:hidden">
      {/*
        알약 하나다: 헤어라인 테두리 + 흰 면 + 그림. 이 화면에서 테두리를 두른 알약은 누르는 것뿐이다.
        self-start(w-fit)라 줄 전체가 아니라 글자만큼만 눌린다 — 폭이 화면만 하면 단추로 안 읽힌다.
        세모(펼침 표시)를 슬라이더 그림으로 바꿨다: 이제 제자리에서 펴지는 물건이 아니라 판을 띄우는 자리다.
      */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap press inline-flex w-fit items-center gap-2 rounded-full border border-line-strong bg-surface py-2 pl-3.5 pr-4 text-[13.5px] font-bold text-ink shadow-hair transition-colors duration-base hover:bg-surface-2"
      >
        <FilterIcon size={16} className="text-dim" />
        {GAMES_FILTER_MESSAGES.sheetTitle}
      </button>

      {/* 걸린 조건은 단추 바로 아래 제 줄에 늘 남는다 — 시트가 떠도 자리를 잃지 않는다 */}
      {strip}

      <Sheet title={GAMES_FILTER_MESSAGES.sheetTitle} open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-6 pt-3">{groups}</div>
        {/*
          바닥 단추. 시트 본문이 스크롤되는 동안에도 따라붙는다 — 장르 드롭다운까지 내려간 손가락이
          닫으려고 맨 위 X 로 되돌아가지 않게 한다. 면을 깔아야 아래 내용이 비쳐 보이지 않는다.
          -mx + px 로 본문 좌우 여백 밖까지 면을 넓힌다: 스크롤되는 글자가 단추 옆으로 새는 것을 막는다.
        */}
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-surface px-4 pb-1 pt-3">
          <Button size="lg" fullWidth onClick={() => setOpen(false)}>
            {GAMES_FILTER_MESSAGES.sheetDone}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
