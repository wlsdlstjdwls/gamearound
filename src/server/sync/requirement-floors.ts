// 사양 문턱 접기 — 설계 문서 §6 의 판정 캐시. 표의 뜻과 "왜 (기기, 게임)이 아닌가" 는 schema 주석에 있다.
//
// 이 파일이 하는 일은 하나다: 사양 행과 부품 후보를 게임 × OS 한 줄로 접어 game_requirement_floors 에 쓴다.
// 접는 규칙은 새로 만들지 않고 lib/hardware/verdict 의 requiredTier 를 그대로 부른다 —
// 규칙이 두 벌이 되면 목록 필터와 상세 화면이 같은 게임에 다른 답을 한다.
import { eq, inArray } from "drizzle-orm";
import { gameRequirementFloors, gameRequirementParts, gameRequirements, type OsFamily, type RequirementTier } from "@/server/db/schema";
import { requiredTier } from "@/lib/hardware/verdict";
import { PART_MATCH_VERSION } from "@/lib/hardware";
import { createdBy } from "@/server/db/audit";
import { runStatements, type Statement } from "./store-apply";
import type { Ctx } from "./context";

/** 접기 전의 사양 한 벌(사양 행 1개 + 그 행의 후보들) */
export type FloorInput = {
  gameId: string;
  osFamily: OsFamily;
  tier: RequirementTier;
  ramMb: number | null;
  storageMb: number | null;
  cpuTiers: Array<number | null>;
  gpuTiers: Array<number | null>;
};

export type FloorRow = {
  gameId: string;
  osFamily: OsFamily;
  minCpuTier: number | null;
  minGpuTier: number | null;
  minRamMb: number | null;
  minStorageMb: number | null;
  recCpuTier: number | null;
  recGpuTier: number | null;
  recRamMb: number | null;
  recStorageMb: number | null;
};

/**
 * 같은 칸에 값이 둘 이상 올 때(스토어가 둘 이상) **낮은 쪽**을 남긴다.
 * 높은 쪽을 적으면 한 스토어에서는 실제로 도는 게임이 목록에서 사라진다 — 없는 편이 나은 손실이 아니다.
 */
function lower(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/** 사양 행들 → 게임 × OS 한 줄. 입력 순서와 무관하게 같은 답이 나온다 */
export function foldFloors(inputs: FloorInput[]): FloorRow[] {
  const byKey = new Map<string, FloorRow>();
  for (const input of inputs) {
    const key = `${input.gameId}:${input.osFamily}`;
    const row = byKey.get(key) ?? {
      gameId: input.gameId,
      osFamily: input.osFamily,
      minCpuTier: null, minGpuTier: null, minRamMb: null, minStorageMb: null,
      recCpuTier: null, recGpuTier: null, recRamMb: null, recStorageMb: null,
    };
    const cpu = requiredTier(input.cpuTiers);
    const gpu = requiredTier(input.gpuTiers);
    if (input.tier === "minimum") {
      row.minCpuTier = lower(row.minCpuTier, cpu);
      row.minGpuTier = lower(row.minGpuTier, gpu);
      row.minRamMb = lower(row.minRamMb, input.ramMb);
      row.minStorageMb = lower(row.minStorageMb, input.storageMb);
    } else {
      row.recCpuTier = lower(row.recCpuTier, cpu);
      row.recGpuTier = lower(row.recGpuTier, gpu);
      row.recRamMb = lower(row.recRamMb, input.ramMb);
      row.recStorageMb = lower(row.recStorageMb, input.storageMb);
    }
    byKey.set(key, row);
  }
  return [...byKey.values()];
}

/**
 * 게임들의 문턱을 다시 접는다. 사양이나 후보가 바뀐 **직후**에만 부른다.
 *
 * 먼저 지우고 새로 넣는 이유: 사양 행이 줄어들면(스토어가 칸을 비웠다) 접힌 값도 같이 줄어야 하는데,
 * upsert 만으로는 예전 값이 남는다. 게임 수가 배치 크기(수십)라 지우고 넣는 편이 더 싸고 더 정확하다.
 */
export async function refreshFloors(ctx: Ctx, gameIds: string[]): Promise<number> {
  if (gameIds.length === 0) return 0;
  const rows = await ctx.db
    .select({
      gameId: gameRequirements.gameId,
      osFamily: gameRequirements.osFamily,
      tier: gameRequirements.tier,
      ramMb: gameRequirements.ramMb,
      storageMb: gameRequirements.storageMb,
      kind: gameRequirementParts.kind,
      partTier: gameRequirementParts.tier,
      requirementId: gameRequirements.id,
    })
    .from(gameRequirements)
    .leftJoin(gameRequirementParts, eq(gameRequirementParts.requirementId, gameRequirements.id))
    .where(inArray(gameRequirements.gameId, gameIds));

  // 후보는 사양 행 하나에 여러 줄로 오므로(left join) 사양 행 단위로 먼저 모은다
  const byRequirement = new Map<number, FloorInput>();
  for (const r of rows) {
    const input = byRequirement.get(r.requirementId) ?? {
      gameId: r.gameId, osFamily: r.osFamily, tier: r.tier,
      ramMb: r.ramMb, storageMb: r.storageMb, cpuTiers: [], gpuTiers: [],
    };
    if (r.kind === "cpu") input.cpuTiers.push(r.partTier);
    if (r.kind === "gpu") input.gpuTiers.push(r.partTier);
    byRequirement.set(r.requirementId, input);
  }

  const floors = foldFloors([...byRequirement.values()]);
  const statements: Statement[] = [
    ctx.db.delete(gameRequirementFloors).where(inArray(gameRequirementFloors.gameId, gameIds)),
  ];
  if (floors.length > 0) {
    statements.push(
      ctx.db.insert(gameRequirementFloors).values(
        floors.map((f) => ({ ...f, matchVersion: PART_MATCH_VERSION, ...createdBy(`crawler:${ctx.source}`) })),
      ),
    );
  }
  await runStatements(ctx, `${ctx.source}:requirement-floors`, statements);
  return floors.length;
}
