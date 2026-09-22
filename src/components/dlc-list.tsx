// 에디션 목록(과 되살릴 때를 위한 추가 콘텐츠 마디) — 기획서 F5.
//
// 추가 콘텐츠는 2026-09-22 에 플랫폼 행의 시트로 옮겼다(components/platform-addons).
// 이 마디는 에디션이 쓰고, 줄 모양은 둘이 dlc-rows 로 함께 쓴다.
// DLC 는 games 행이라 자기 상세 화면도 갖는다. 여기서는 제목과 값만 보여주고 나머지는 그 화면에 맡긴다.
//
// "목록은 없는데 스토어가 추가 콘텐츠가 있다고만 알려준" 상태를 따로 다룬다.
// 그걸 "DLC 없음"으로 적으면 사실이 아니고, 빈 목록으로 두면 수집이 고장난 것처럼 보인다.
//
// **플랫폼 칩을 다는 이유**(2026-09-16): 자식 게임 15,560건 중 10,648건이 본편과 플랫폼 집합이 다르다.
// 전에는 행마다 최저가 하나만 찍어서, 스팀 9,400원 대 Xbox 7,400원인 DLC 는 "7,400 Xbox" 로만 보였다.
// PS 유저는 그게 자기 기기에 있는지조차 알 수 없었고, 스팀에 없는 DLC 도 그 사실이 안 보였다.
// 칩을 고르면 목록도 값도 그 플랫폼 것으로 바뀐다 — 최저가가 아니라 **내가 낼 값**을 본다.
//
// 칩은 두 개 이상일 때만 세운다. 하나뿐이면 고를 것이 없고 줄만 하나 더 먹는다(§6, 칩 대 드롭다운 기준).
// 건수를 머리에 적어야 해서 SectionHead 까지 이 파일이 그린다 — 필터를 걸었는데 머리가 전체 건수를
// 말하고 있으면 둘 중 어느 쪽이 참인지 알 수 없다.
//
// 한계: 상세는 자식 300건을 읽어 갈래로 세운 뒤 30건만 넘겨준다(detail 의 DETAIL_DLC_LIMIT).
// 칩은 그 30건 안에서만 거른다 — 자식이 수백 개인 게임에서 "Xbox 3개" 는 화면에 온 것의 수이지 전부가 아니다.
"use client";

import { useMemo, useState } from "react";
import { ChipButton } from "@/components/ui/chip";
import { DlcRows } from "@/components/dlc-rows";
import { Collapsible } from "@/components/ui/collapsible";
import { cheapestOf } from "@/lib/currency";
import { PLATFORM_LABEL } from "@/lib/format";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { PLATFORM_ORDER } from "@/lib/platform";
import type { Platform } from "@/server/db/schema";
import type { DlcDto, PlatformDto } from "@/server/services/games";

/** 고른 칩. null 은 "전체" — 플랫폼을 안 좁힌 상태다 */
type Selected = Platform | null;

/** 한 줄에 세울 값. 전체일 때는 최저가, 플랫폼을 고르면 그 플랫폼의 값 */
function priceOf(d: DlcDto, selected: Selected): PlatformDto | null {
  // 서비스의 cheapestPlatform 대신 lib 의 cheapestOf 를 직접 쓴다 — 서비스 진입점을 값으로 들여오면
  // 클라이언트 번들에 DB 클라이언트까지 딸려 온다(index 가 detail, list 를 함께 내보낸다)
  if (selected === null) return cheapestOf(d.platforms);
  // 같은 플랫폼이 나라별로 여러 행일 수 있다(Switch 한국, 일본). 그 안에서 다시 최저가를 고른다
  return cheapestOf(d.platforms.filter((p) => p.platform === selected));
}

export function DlcSection({
  id,
  title,
  dlcs,
  hasAddOns,
}: {
  id: string;
  title: string;
  dlcs: DlcDto[];
  hasAddOns: boolean;
}) {
  const [selected, setSelected] = useState<Selected>(null);

  // 목록에 실제로 있는 플랫폼만. 순서는 PLATFORM_ORDER 를 따른다 —
  // 가격 표와 다른 순서로 서면 같은 화면에서 눈이 두 번 길을 잃는다
  const platforms = useMemo(
    () => PLATFORM_ORDER.filter((p) => dlcs.some((d) => d.platforms.some((pp) => pp.platform === p))),
    [dlcs],
  );

  const rows = useMemo(
    () =>
      (selected === null ? dlcs : dlcs.filter((d) => d.platforms.some((p) => p.platform === selected))).map((d) => ({
        dlc: d,
        best: priceOf(d, selected),
      })),
    [dlcs, selected],
  );

  return (
    // 접어 두는 이유(2026-09-21): DLC 가 30줄까지 가는 게임이 있고, 그 30줄이 "파는 곳" 과
    // 패치 기록을 화면 두 개 밖으로 밀었다. 그런데 본편을 보러 온 사람 대부분은 추가 콘텐츠를
    // 안 연다 — 열 사람은 목적을 갖고 열고, 그때 건수는 제목 옆에서 이미 보인다.
    <Collapsible id={id} title={title} note={rows.length > 0 ? `${rows.length}개` : undefined}>
      <div className="flex flex-col gap-3">
      {platforms.length > 1 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="플랫폼">
          <li>
            <ChipButton size="sm" active={selected === null} onClick={() => setSelected(null)}>
              전체
            </ChipButton>
          </li>
          {platforms.map((p) => (
            <li key={p}>
              <ChipButton size="sm" active={selected === p} onClick={() => setSelected(p)}>
                {PLATFORM_LABEL[p] ?? p}
              </ChipButton>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 0 ? (
        <p className="text-[13px] text-dim">{hasAddOns ? GAME_MESSAGES.dlcKnownButUnlisted : GAME_MESSAGES.dlcNone}</p>
      ) : (
        <DlcRows rows={rows} />
      )}
      </div>
    </Collapsible>
  );
}
