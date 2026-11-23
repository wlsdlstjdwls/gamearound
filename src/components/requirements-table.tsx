// 구동 사양표 — 설계 문서 §7 "내 PC 로 돌아갈까요" 의 1단계. 판정은 아직 없고, 스토어가 적어 둔 값을 옮긴다.
//
// 최소와 권장을 한 표에 나란히 두는 이유: 사용자가 묻는 것은 "돌아가나" 와 "쾌적한가" 둘인데
// 두 값은 나란히 봐야 뜻이 산다("메모리 8 대 16" 은 한 칸씩 떨어뜨려 놓으면 비교가 안 된다).
// 권장이 없는 게임이 흔해서(표본 60건 중 11건) 그때는 칸을 아예 세우지 않는다.
//
// 값이 없는 줄은 그리지 않는다. 멀티플레이 칩에서 배운 것과 같다 — 빈칸을 "-" 로 채우면
// 화면에서 제일 큰 자리가 줄줄이 "-" 가 되고, 그건 "아직 모은다" 가 아니라 "고장 났다" 로 읽힌다.
import { DetailTabs } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";
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

/**
 * 내 PC 칸(2026-11-23 사용자 "내 PC 구동 확인, 구동 사양을 합쳐서"). 판정 칸이 옆 기둥에 따로 서서 내 부품과 요구 부품을 두 자리에서 오가며 견줬다 —
 * 이제 사양표 맨 오른쪽 한 칸에 내 값과 충족 여부가 같은 줄로 선다. 그 OS 표에만 붙는다(맥 기기면 맥 탭). 값을 만드는 일은 compat-section 이 한다
 */
export type MineColumn = {
  osFamily: RequirementGroupDto["osFamily"];
  label: string;
  cells: Partial<Record<RowKey, React.ReactNode>>;
};
type RowKey = keyof typeof REQUIREMENT_ROW_LABEL;

function OsTable({ group, showTitle, mine }: { group: RequirementGroupDto; showTitle: boolean; mine?: MineColumn }) {
  const tiers = [group.minimum, group.recommended].filter((t): t is RequirementDto => t !== null);
  // 양쪽 다 빈 줄은 세우지 않는다
  const rows = ROWS.map((row) => ({ ...row, values: tiers.map(row.valueOf) })).filter((row) => row.values.some(Boolean));
  const mineHere = mine && mine.osFamily === group.osFamily ? mine : null;
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {showTitle && <h3 className="text-[13px] font-bold text-ink">{OS_FAMILY_LABEL[group.osFamily]}</h3>}
      {/* 2026-11-23 사용자 "구분이 잘 안 된다", 이어서 "구동 사양 영역 UI/UX 개선, 보기 힘들다". 판 없이 선만 그은 표는 값이 옅은 회색(mut)이라
          바탕에 묻혔고, 어디까지가 표인지 경계가 없었다. 테두리 한 줄로 표를 판으로 세우고, 머리 줄만 회색 면, 항목 칸은 진한 굵은 글자,
          값은 읽히는 진하기(ink-2)로 올렸다. 강조(최소 쪽 다른 값)는 굵기와 먹색으로만 말한다 */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] ring-1 ring-line ring-inset">
        <table className="w-full min-w-[320px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              <th scope="col" className="w-[104px] py-2.5 pl-4 pr-3 font-medium text-dim">
                <span className="sr-only">항목</span>
              </th>
              {/* 내 PC 칸이 맨 앞(2026-11-23 사용자 "내 PC 가 맨 앞에") — 내 값을 먼저 보고 오른쪽 요구값과 견준다. 머리 글자는 가운데(같은 날) */}
              {mineHere && (
                <th scope="col" className="border-l border-line bg-acc-soft px-3 py-2.5 text-center text-[13.5px] font-bold text-acc">
                  {mineHere.label}
                </th>
              )}
              {tiers.map((t) => (
                <th key={t.tier} scope="col" className="border-l border-line px-3 py-2.5 text-center text-[13.5px] font-bold text-ink">
                  {REQUIREMENT_TIER_LABEL[t.tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line-soft last:border-b-0 align-top">
                <th scope="row" className="py-3 pl-4 pr-3 text-[13px] font-semibold text-ink-2">
                  {REQUIREMENT_ROW_LABEL[row.key]}
                </th>
                {/* 내 PC 칸은 옅은 파랑 면 — "요구" 두 칸과 "내 것" 한 칸이 다른 갈래임을 말한다. 맨 앞이다(머리 주석) */}
                {mineHere && <td className="border-l border-line-soft bg-acc-soft/50 py-3 pl-4 pr-3 leading-[1.55] text-ink-2">{mineHere.cells[row.key] ?? null}</td>}
                {/* 최소와 권장은 늘 따로 적고, 둘이 다른 줄의 **최소 값만** 진하게 세운다(2026-11-23 사용자 "그냥 둘 다 각각 표기, 다른 것만 강조",
                    이어서 "권장은 강조하지 말고 최소만"). 한 칸으로 합치던 때는 합친 칸이 최소 쪽 값인지 둘 다인지 헷갈렸다 */}
                {row.values.map((v, i) => {
                  const differs = row.values.length === 2 && row.values[0] !== row.values[1];
                  return (
                    <td
                      key={tiers[i].tier}
                      className={cn(
                        "border-l border-line-soft py-3 pl-4 pr-3 leading-[1.55] break-keep",
                        differs && tiers[i].tier === "minimum" ? "font-bold text-ink" : "text-ink-2",
                      )}
                    >
                      {v}
                    </td>
                  );
                })}
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
export function RequirementsBody({ groups, mine }: { groups: RequirementGroupDto[]; mine?: MineColumn }) {
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
      tabs={shown.map((g) => ({ key: g.osFamily, label: OS_FAMILY_LABEL[g.osFamily], panel: <OsTable group={g} showTitle={false} mine={mine} /> }))}
    />
  );
}
