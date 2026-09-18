"use client";
// "내 기기로 돌아가요" 칩 — 설계 문서 §7 의 3단계 필터를 고르는 자리.
//
// 이 자리만 클라이언트인 이유: 비회원의 기기는 브라우저에만 있다(설계 §4). 서버는 그 값을 모르니
// 칩의 주소(rig=)를 서버에서 만들 수 없다. 로그인한 사람의 기기는 서버가 넘겨 주고,
// 둘 다 없으면 이 자리에서 바로 적게 한다 — 목록을 떠나 설정 화면까지 다녀오게 하지 않는다.
//
// 걸러지는 조건 자체는 SQL 한 곳에 있다(services/games/filters 의 runsOnRig).
// 여기서 하는 일은 기기를 주소에 실을 값으로 접는 것뿐이다(lib/hardware/rig).
import { useState } from "react";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { useGuestDevice, type CompatDevice } from "@/components/devices/guest-device";
import { GuestDeviceForm } from "@/components/devices/guest-device-form";
import { RIG_FILTER_MESSAGES } from "@/lib/games/messages";
import { encodeRig } from "@/lib/hardware/rig";
import { gamesHref, type GamesQuery } from "@/lib/games-query";
import { KEEP_SCROLL } from "./groups";

export function RigChip({ filter, devices }: { filter: GamesQuery; devices: CompatDevice[] }) {
  const [editing, setEditing] = useState(false);
  // 서버 그림에서는 늘 null 이다 — 브라우저에만 있는 값이라 서버가 알 방법이 없다
  const guest = useGuestDevice();
  // 계정에 등록한 기기가 먼저다. 그 사람은 여러 대를 관리하려고 적어 둔 것이라 브라우저 값보다 최신이다
  const device = devices[0] ?? guest ?? null;
  const rig = device ? encodeRig(device) : null;
  const active = Boolean(filter.rig);

  // 기기를 아직 모르면 칩 대신 적는 자리를 편다. 누를 수 없는 칩을 보여 주면
  // 왜 안 눌리는지 화면에서 읽을 방법이 없다
  if (!device || editing) {
    return (
      <div className="flex w-full flex-col gap-2">
        <GuestDeviceForm
          current={guest}
          columns={false}
          lead={RIG_FILTER_MESSAGES.lead}
          onSaved={() => setEditing(false)}
        />
      </div>
    );
  }

  // 적기는 적었는데 부품을 하나도 못 알아본 경우. 걸 조건이 없으니 칩을 세우지 않고 왜인지를 적는다
  const usable = rig !== null || active;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {usable && (
          <ChipNavLink
            {...KEEP_SCROLL}
            href={gamesHref(filter, { rig: active ? undefined : rig ?? undefined, page: 1 })}
            active={active}
          >
            {RIG_FILTER_MESSAGES.chip}
          </ChipNavLink>
        )}
        {/* 계정에 기기가 있는 사람은 설정 화면이 제자리다 — 여기서 고치면 브라우저 값만 바뀌어 헷갈린다 */}
        {devices.length === 0 && (
          <button type="button" onClick={() => setEditing(true)} className="min-h-[36px] text-[12px] text-acc hover:underline">
            {RIG_FILTER_MESSAGES.edit}
          </button>
        )}
      </div>
      <p className="text-[11px] leading-[1.6] text-dim">
        {usable ? RIG_FILTER_MESSAGES.note : RIG_FILTER_MESSAGES.unmatched}
      </p>
    </div>
  );
}
