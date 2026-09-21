// 구동 사양표 — 설계 문서 §7 "내 PC 로 돌아갈까요" 의 1단계. 판정은 아직 없고, 스토어가 적어 둔 값을 옮긴다.
//
// 최소와 권장을 한 표에 나란히 두는 이유: 사용자가 묻는 것은 "돌아가나" 와 "쾌적한가" 둘인데
// 두 값은 나란히 봐야 뜻이 산다("메모리 8 대 16" 은 한 칸씩 떨어뜨려 놓으면 비교가 안 된다).
// 권장이 없는 게임이 흔해서(표본 60건 중 11건) 그때는 칸을 아예 세우지 않는다.
//
// 값이 없는 줄은 그리지 않는다. 멀티플레이 칩에서 배운 것과 같다 — 빈칸을 "-" 로 채우면
// 화면에서 제일 큰 자리가 줄줄이 "-" 가 되고, 그건 "아직 모은다" 가 아니라 "고장 났다" 로 읽힌다.
import { SectionHead } from "@/components/ui/page";
import { formatSizeMb } from "@/lib/format";
import { GAME_MESSAGES, OS_FAMILY_LABEL, REQUIREMENT_ROW_LABEL, REQUIREMENT_TIER_LABEL } from "@/lib/games/messages";
import type { RequirementDto, RequirementGroupDto } from "@/server/services/games";

/** 표에 세울 줄과 그 값 꺼내는 법. 순서가 곧 화면 순서다 — 사용자가 먼저 보는 것부터 */
const ROWS: Array<{ key: keyof typeof REQUIREMENT_ROW_LABEL; valueOf: (r: RequirementDto) => string }> = [
  { key: "osText", valueOf: (r) => r.osText ?? "" },
  { key: "cpuText", valueOf: (r) => r.cpuText ?? "" },
  { key: "ramMb", valueOf: (r) => formatSizeMb(r.ramMb) },
  { key: "gpuText", valueOf: (r) => r.gpuText ?? "" },
  { key: "vramMb", valueOf: (r) => formatSizeMb(r.vramMb) },
  { key: "directxText", valueOf: (r) => r.directxText ?? "" },
  { key: "storageMb", valueOf: (r) => formatSizeMb(r.storageMb) },
  { key: "noteText", valueOf: (r) => r.noteText ?? "" },
];

function OsTable({ group }: { group: RequirementGroupDto }) {
  const tiers = [group.minimum, group.recommended].filter((t): t is RequirementDto => t !== null);
  // 양쪽 다 빈 줄은 세우지 않는다
  const rows = ROWS.map((row) => ({ ...row, values: tiers.map(row.valueOf) })).filter((row) => row.values.some(Boolean));
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[13px] font-bold text-ink">{OS_FAMILY_LABEL[group.osFamily]}</h3>
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
                {row.values.map((v, i) => (
                  <td key={tiers[i].tier} className="py-2 pr-3 leading-[1.6] text-mut">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 사양이 하나도 없으면 칸 자체를 세우지 않는다 — 콘솔 전용 게임에는 물어볼 축이 없다(설계 §7) */
export function RequirementsSection({ groups }: { groups: RequirementGroupDto[] }) {
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby="requirements-heading" className="flex flex-col gap-3">
      <SectionHead id="requirements-heading" title={GAME_MESSAGES.requirementHeading} />
      <div className="flex flex-col gap-5 border-t border-line-strong pt-4">
        {groups.map((g) => (
          <OsTable key={g.osFamily} group={g} />
        ))}
        <p className="text-[11.5px] leading-[1.6] text-dim">{GAME_MESSAGES.requirementNote}</p>
      </div>
    </section>
  );
}
