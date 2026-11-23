"use client";
// "업데이트 노트" 탭 본문 — 플랫폼 칩으로 스토어를 고르고, 목록은 몇 건만 펴 두고 나머지는 단추로 연다(2026-11-11 사용자
// "접었다 펼칠 수 있게, 플랫폼별로 볼 수 있게 탭으로"). 전에는 모든 스토어 기록을 섞어 50건을 한 번에 깔아 화면 몇 장을 먹었다.
//
// 칩은 기록이 있는 스토어가 둘 이상일 때만 선다 — 하나뿐이면 고를 것이 없다(2026-11-11 운영 DB 는 Steam 기록뿐이다,
// 다른 스토어는 패치 기록을 공개하지 않는다). 고르기는 이 마디만 아는 값이라 주소에 싣지 않는다.
// 펴기는 서버를 다시 부르지 않는다 — 기록은 다 받아 와 있고 감출 뿐이라 누른 순간 늘어난다(AGENTS 6장).
//
// 다섯 건 넘는 기록은 마디 오른쪽 위 "전체 보기" 단추가 팝업으로 연다(2026-11-23 사용자 "17건 모두 보기 없애고 오른쪽 위 전체 보기, 팝업으로").
// 아래로 펴는 단추는 탭 판을 화면 몇 장 길이로 늘였다. 팝업 안 줄을 누르면 그 글의 팝업이 그 위로 한 겹 더 열린다(PatchList).
//
// 위 플랫폼 카드를 고르면 그 플랫폼 기록만 보인다(2026-11-16 사용자 "업데이트 노트는 선택된 플랫폼으로"). 고르기는 game-detail/platform-pick 한 값이라
// 그래프, 할인 예측과 같이 움직인다. 고른 플랫폼이 기록을 안 내면(PS, Xbox, 닌텐도는 패치 기록을 공개하지 않는다) 어느 카드를 고르면 보이는지 말한다.
import { useState } from "react";
import { PatchList } from "@/components/patch-list";
import { ChipButton } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { TEXT_LINK } from "@/components/ui/button";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { platformLabel } from "@/lib/format";
import { pickMatches } from "@/lib/platform";
import { usePlatformPick } from "@/components/game-detail/platform-pick";
import type { PlatformPatchesDto } from "@/server/services/games";

/** 접힌 채로 보여 줄 건수 — 최근 몇 번 고쳤는지 보기엔 다섯이면 넉넉하다. 뉴스 마디의 셋보다 많은 이유: 패치는 한 줄이 짧다 */
const PATCH_PREVIEW = 5;

const keyOf = (g: Pick<PlatformPatchesDto, "platform" | "region">) => `${g.platform}:${g.region}`;

export function PatchNotesPanel({ groups: all, limit }: { groups: PlatformPatchesDto[]; limit: number }) {
  const pick = usePlatformPick();
  const brand = pick?.brand ?? null;
  // 카드 고르기를 따른다. PC 카드(Steam, Epic 합친 카드)는 두 스토어 기록을 함께 보고 칩으로 가른다
  const groups = brand === null ? all : all.filter((g) => pickMatches(brand, g.platform));
  // 처음 고른 스토어는 기록이 가장 많은 곳 — 대개 가장 자주 고치는 판이다
  const first = [...groups].sort((a, b) => b.count - a.count)[0];
  const [picked, setPicked] = useState("");
  const [open, setOpen] = useState(false);
  const group = groups.find((g) => keyOf(g) === picked) ?? first;
  if (!group) {
    return <p className="text-[13px] text-dim">{D.patchesNoneForPick}</p>;
  }
  const items = group ? [...group.notes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit) : [];
  const more = items.length > PATCH_PREVIEW;
  const shown = items.slice(0, PATCH_PREVIEW);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* 고른 스토어 이름과 "전체 보기" 를 한 줄에. 선은 그리지 않는다 — 바로 아래 목록(PatchList)이 제 윗선을 긋는다(같은 날 "Steam 아래 줄이 2개")(2026-11-23 사용자 "전체 보기 위 줄이 잘려 있다") —
          스토어 이름 표(PatchSpeed)를 왼쪽 칸에 넣었더니 그 표의 선이 단추 앞에서 끊겼다. 마지막 패치 날짜는 같은 날 걷어 표가 할 일이 이름뿐이었다 */}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-[13.5px] font-bold text-ink">{platformLabel(group)}</span>
        {more && (
          <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={TEXT_LINK}>
            {D.patchesAll}
          </button>
        )}
      </div>
      {groups.length > 1 && (
        <div role="group" aria-label={D.patchesPlatformLabel} className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <ChipButton
              key={keyOf(g)}
              active={keyOf(g) === keyOf(group)}
              onClick={() => {
                setPicked(keyOf(g));
                setOpen(false);
              }}
            >
              {platformLabel(g)}
            </ChipButton>
          ))}
        </div>
      )}
      <PatchList items={shown} />
      {more && (
        <Sheet title={D.patchesAllTitle(platformLabel(group), items.length)} size="wide" open={open} onOpenChange={setOpen}>
          {/* 따로 스크롤 상자를 두지 않는다 — 시트 본문이 이미 굴러가서 세로 막대가 둘 섰다(2026-11-23 사용자). 가로로는 넘치지 않게 자른다 */}
          <div className="min-w-0 overflow-x-hidden pt-2">
            <PatchList items={items} />
          </div>
        </Sheet>
      )}
    </div>
  );
}
