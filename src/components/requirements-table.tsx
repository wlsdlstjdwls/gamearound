// 구동 사양표 — 설계 문서 §7 "내 PC 로 돌아갈까요" 의 1단계. 판정은 아직 없고, 스토어가 적어 둔 값을 옮긴다.
//
// 최소와 권장을 한 표에 나란히 두는 이유: 사용자가 묻는 것은 "돌아가나" 와 "쾌적한가" 둘인데
// 두 값은 나란히 봐야 뜻이 산다("메모리 8 대 16" 은 한 칸씩 떨어뜨려 놓으면 비교가 안 된다).
// 권장이 없는 게임이 흔해서(표본 60건 중 11건) 그때는 칸을 아예 세우지 않는다.
//
// 값이 없는 줄은 그리지 않는다. 멀티플레이 칩에서 배운 것과 같다 — 빈칸을 "-" 로 채우면
// 화면에서 제일 큰 자리가 줄줄이 "-" 가 되고, 그건 "아직 모은다" 가 아니라 "고장 났다" 로 읽힌다.
import { DetailTabs } from "@/components/ui/tabs";
import { formatSizeMb } from "@/lib/format";
import { OS_FAMILY_LABEL, REQUIREMENT_ROW_LABEL, REQUIREMENT_TIER_LABEL } from "@/lib/games/messages";
import type { RequirementDto, RequirementGroupDto } from "@/server/services/games";

/** 탭 순서와 세우는 탭 — 윈도우, 맥 둘(2026-11-23 사용자). 사양을 적은 게임 수도 이 순서다(윈도우 6,347, 맥 1,649, 2026-11-23 실측) */
const OS_ORDER: RequirementGroupDto["osFamily"][] = ["windows", "mac"];
const OS_TABS_LABEL = "운영체제";

/** 표에 세울 줄과 그 값 꺼내는 법. 순서가 곧 화면 순서다 — 사용자가 먼저 보는 것부터 */
const ROWS: Array<{ key: keyof typeof REQUIREMENT_ROW_LABEL; valueOf: (r: RequirementDto) => string }> = [
  { key: "osText", valueOf: (r) => r.osText ?? "" },
  { key: "cpuText", valueOf: (r) => r.cpuText ?? "" },
  { key: "ramMb", valueOf: (r) => formatSizeMb(r.ramMb) },
  { key: "gpuText", valueOf: (r) => r.gpuText ?? "" },
  { key: "vramMb", valueOf: (r) => formatSizeMb(r.vramMb) },
  { key: "directxText", valueOf: (r) => r.directxText ?? "" },
  { key: "storageMb", valueOf: (r) => formatSizeMb(r.storageMb) },
  // "그 밖에"(note_text)는 여기 없다 — 뺀 근거는 lib/games/messages 의 REQUIREMENT_ROW_LABEL 주석
];

function OsTable({ group, showTitle }: { group: RequirementGroupDto; showTitle: boolean }) {
  const tiers = [group.minimum, group.recommended].filter((t): t is RequirementDto => t !== null);
  // 양쪽 다 빈 줄은 세우지 않는다
  const rows = ROWS.map((row) => ({ ...row, values: tiers.map(row.valueOf) })).filter((row) => row.values.some(Boolean));
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {showTitle && <h3 className="text-[13px] font-bold text-ink">{OS_FAMILY_LABEL[group.osFamily]}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-[84px] py-2 pr-3 font-medium text-dim">
                <span className="sr-only">항목</span>
              </th>
              {tiers.map((t) => (
                <th key={t.tier} scope="col" className="py-2 pr-3 font-bold text-ink-2">
                  {REQUIREMENT_TIER_LABEL[t.tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line-soft last:border-b-0 align-top">
                <th scope="row" className="py-2 pr-3 font-medium text-dim">
                  {REQUIREMENT_ROW_LABEL[row.key]}
                </th>
                {/* 최소와 권장이 같은 값이면 한 칸으로 합친다(2026-11-23 사용자 "동일한 값일 때는 통일해서") — 같은 글자 두 번이 표를 길게 했다 */}
                {row.values.length === 2 && row.values[0] === row.values[1] ? (
                  <td colSpan={2} className="py-2 pr-3 leading-[1.6] text-mut">
                    {row.values[0]}
                  </td>
                ) : (
                  row.values.map((v, i) => (
                    <td key={tiers[i].tier} className="py-2 pr-3 leading-[1.6] text-mut">
                      {v}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 사양이 하나도 없으면 칸 자체를 세우지 않는다 — 콘솔 전용 게임에는 물어볼 축이 없다(설계 §7).
 *
 * **제목도 접는 장치도 여기 없다**(2026-09-21). 이 표는 판정 칸과 한 마디로 묶였고, 그 둘의
 * 공통 머리와 여닫기는 RunCheck 가 맡는다 — 따로 접히면 근거만 펴 놓거나 결론만 펴 놓는,
 * 아무도 원하지 않는 상태가 만들어진다. "어느 OS 가 있는지" 도 그 공통 머리가 말한다.
 */
export function RequirementsBody({ groups }: { groups: RequirementGroupDto[] }) {
  if (groups.length === 0) return null;
  // 윈도우, 맥 두 탭으로 하나씩 본다(2026-11-23 사용자 "윈도우/맥 탭 형태로, 탭을 바꿔도 높이가 변하지 않게").
  // 표를 세로로 쌓으면 맥 사용자가 윈도우 표를 지나 내려가야 했고, 같은 칸 이름이 되풀이됐다.
  // 리눅스 표는 세우지 않는다 — 사용자가 두 탭으로 정했다. 리눅스 사양만 있는 게임은 그 표를 그대로 보인다(빈 칸보다 낫다).
  // 한 벌뿐이어도 탭으로 세운다(같은 날 "한 개라도 탭으로") — 게임마다 표 머리 모양이 바뀌면 어느 운영체제 표인지 다시 읽어야 한다
  const tabbed = OS_ORDER.flatMap((os) => groups.filter((g) => g.osFamily === os));
  const shown = tabbed.length > 0 ? tabbed : groups.slice(0, 1);
  return (
    <DetailTabs
      size="sm"
      keepHeight
      label={OS_TABS_LABEL}
      tabs={shown.map((g) => ({ key: g.osFamily, label: OS_FAMILY_LABEL[g.osFamily], panel: <OsTable group={g} showTitle={false} /> }))}
    />
  );
}
