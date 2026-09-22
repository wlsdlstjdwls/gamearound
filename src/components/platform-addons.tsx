"use client";
// 플랫폼 행의 "추가 콘텐츠" 버튼 — 좁은 화면은 바텀시트, 넓은 화면은 팝업(ui/sheet 가 둘을 낸다).
//
// 왜 마디를 없애고 행으로 옮겼나(2026-09-22, 사용자 결정): 추가 콘텐츠는 접는 마디 하나로 서서
// 플랫폼 칩을 자기 안에 또 갖고 있었다. 그런데 사는 사람이 묻는 것은 "내 기기에 뭐가 더 있나" 라
// 플랫폼을 고르는 일이 두 번 일어났다(위에서 값을 보며 한 번, 마디 안에서 또 한 번).
// 값이 선 그 줄에서 바로 열면 고르는 일이 한 번으로 준다.
//
// 값은 **그 플랫폼의 값**이다. 최저가가 아니다 — 이 버튼을 누른 사람은 이미 기기를 정한 사람이다.
import { useMemo } from "react";
import { Sheet } from "@/components/ui/sheet";
import { PlusIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";
import { DlcRows } from "@/components/dlc-rows";
import { cheapestOf } from "@/lib/currency";
import { GAME_MESSAGES } from "@/lib/games/messages";
import type { Platform } from "@/server/db/schema";
import type { DlcDto } from "@/server/services/games";

/**
 * 행 안에서 "스토어" 버튼과 키를 맞춘 보조 버튼. 모양은 공용 버튼이 갖는다 — 같은 줄의 두 버튼이 따로 놀면 안 된다.
 *
 * **이름을 다시 적는다**(2026-09-22, 사용자 지적: "+1 이런 버튼으로 표기했던데, 이게 뭔지 어떻게 아니").
 * 같은 날 아침에는 자리를 아끼려고 아이콘 + 숫자만 남겼는데, 그러면 무엇을 여는 버튼인지 알 길이
 * 눌러 보는 것밖에 없다 — 스크린리더 문구와 시트 제목은 **연 다음에야** 읽히는 말이다.
 * 자리는 같은 날 이름 기둥에서 46px 을 돌려받아(platform-prices 의 NAME_COL) 여기로 왔다.
 *
 * 이름이 서는 것은 xl(1280) 위에서다. 그 아래에서는 갈래 둘이 가로로 서면서 한 줄이 약 460px 이라
 * 이름표가 값을 칸 밖으로 밀어낸다(2026-09-22 실측: "PC 컨텐츠가 콘솔 영역으로 넘어가버려").
 * 좁을 때는 아이콘과 숫자만 남기고, 무엇을 여는지는 스크린리더 문구와 시트 제목이 갖는다.
 */
const TRIGGER_CLASS = buttonClass({ variant: "soft", size: "row", className: "shrink-0 gap-1 px-2.5" });

export function PlatformAddons({
  platform,
  platformLabel,
  dlcs,
}: {
  platform: Platform;
  /** 시트 제목에 쓸 사람 말 이름(PlayStation, Steam) */
  platformLabel: string;
  /** 이 플랫폼에 있는 추가 콘텐츠만 걸러 넘긴다 — 행마다 카탈로그 전체를 들고 있지 않기 위해서다 */
  dlcs: DlcDto[];
}) {
  const rows = useMemo(
    () => dlcs.map((d) => ({ dlc: d, best: cheapestOf(d.platforms.filter((p) => p.platform === platform)) })),
    [dlcs, platform],
  );

  return (
    <Sheet
      label={
        <>
          <PlusIcon size={14} />
          <span className="hidden text-[12.5px] font-semibold xl:inline">{GAME_MESSAGES.dlcHeading}</span>
          {rows.length > 0 && <span className="text-[12.5px] font-bold">{rows.length}</span>}
          <span className="sr-only">{rows.length > 0 ? `${GAME_MESSAGES.dlcHeading} ${rows.length}개 보기` : `${GAME_MESSAGES.dlcHeading} 보기`}</span>
        </>
      }
      // 제목에 게임 이름을 넣지 않는다 — 이 시트를 연 사람은 그 게임 화면 안에 있고, 좁은 화면에서 머리가 두 줄이 된다
      title={`${platformLabel} ${GAME_MESSAGES.dlcHeading}`}
      unstyledTrigger
      triggerClassName={TRIGGER_CLASS}
    >
      {rows.length === 0 ? (
        <p className="text-[13px] text-dim">{GAME_MESSAGES.dlcKnownButUnlisted}</p>
      ) : (
        <DlcRows rows={rows} />
      )}
    </Sheet>
  );
}
