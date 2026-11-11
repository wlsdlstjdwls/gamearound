"use client";
// "업데이트 노트" 탭 본문 — 플랫폼 칩으로 스토어를 고르고, 목록은 몇 건만 펴 두고 나머지는 단추로 연다(2026-11-11 사용자
// "접었다 펼칠 수 있게, 플랫폼별로 볼 수 있게 탭으로"). 전에는 모든 스토어 기록을 섞어 50건을 한 번에 깔아 화면 몇 장을 먹었다.
//
// 칩은 기록이 있는 스토어가 둘 이상일 때만 선다 — 하나뿐이면 고를 것이 없다(2026-11-11 운영 DB 는 Steam 기록뿐이다,
// 다른 스토어는 패치 기록을 공개하지 않는다). 고르기는 이 마디만 아는 값이라 주소에 싣지 않는다.
// 펴기는 서버를 다시 부르지 않는다 — 기록은 다 받아 와 있고 감출 뿐이라 누른 순간 늘어난다(AGENTS 6장).
import { useState } from "react";
import { PatchList } from "@/components/patch-list";
import { ChipButton } from "@/components/ui/chip";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { platformLabel } from "@/lib/format";
import type { PlatformPatchesDto } from "@/server/services/games";

/** 접힌 채로 보여 줄 건수 — 최근 몇 번 고쳤는지 보기엔 다섯이면 넉넉하다. 뉴스 마디의 셋보다 많은 이유: 패치는 한 줄이 짧다 */
const PATCH_PREVIEW = 5;

const keyOf = (g: Pick<PlatformPatchesDto, "platform" | "region">) => `${g.platform}:${g.region}`;

export function PatchNotesPanel({ groups, limit }: { groups: PlatformPatchesDto[]; limit: number }) {
  // 처음 고른 스토어는 기록이 가장 많은 곳 — 대개 가장 자주 고치는 판이다
  const first = [...groups].sort((a, b) => b.count - a.count)[0];
  const [picked, setPicked] = useState(first ? keyOf(first) : "");
  const [open, setOpen] = useState(false);
  const group = groups.find((g) => keyOf(g) === picked) ?? first;
  const items = group ? [...group.notes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit) : [];
  const more = items.length > PATCH_PREVIEW;
  const shown = open ? items : items.slice(0, PATCH_PREVIEW);

  return (
    <div className="flex min-w-0 flex-col gap-3">
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
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="press tap self-center rounded-full px-4 py-2 text-[13px] font-semibold text-mut ring-1 ring-line-strong ring-inset transition-colors duration-base hover:text-acc hover:ring-acc"
        >
          {open ? D.patchesLess : D.patchesMore(items.length)}
        </button>
      )}
    </div>
  );
}
