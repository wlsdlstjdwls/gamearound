// 업무 일정(WBS) 저장 규칙(2026-11-04). 화면 검사와 저장 액션이 이 스키마 하나를 쓴다(AGENTS §2).
// 저장 단위는 화면 전체다 — 줄 옮기기(들여쓰기, 순서)가 여러 줄의 상위와 순서를 한꺼번에 바꾸므로 한 줄씩 저장하면 중간 모양이 남는다.
// 그래서 바뀐 줄과 지운 줄의 열쇠를 한 번에 보내고 서버가 한 묶음(batch)으로 쓴다.
import { z } from "zod";
import { PLAN_KINDS, PLAN_PROGRESS_MAX } from "@/lib/admin/plan";

/** 작업명 길이. 간트 왼쪽 칸과 그리드 한 칸에 들어갈 만큼 */
export const PLAN_TITLE_MAX = 120;
/** 파트 코드값 길이(공통코드 코드값 한계와 같다) */
export const PLAN_TRACK_MAX = 40;
export const PLAN_MEMO_MAX = 2000;
/** 한 번에 저장할 줄 수 한계. 일정표가 이보다 커지면 화면 하나로 다룰 표가 아니다 */
export const PLAN_SAVE_MAX = 500;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();
const isoDate = z.string().regex(ISO_DATE).nullable();

export const planItemSchema = z
  .object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    sortOrder: z.number().int().min(0),
    title: z.string().trim().min(1).max(PLAN_TITLE_MAX),
    // 파트는 공통코드에서 늘어난다(schema-plan 주석). 코드값 모양만 본다
    track: z.string().trim().min(1).max(PLAN_TRACK_MAX),
    kind: z.enum(PLAN_KINDS),
    startOn: isoDate,
    endOn: isoDate,
    progress: z.number().int().min(0).max(PLAN_PROGRESS_MAX).nullable(),
    assigneeId: z.uuid().nullable(),
    memo: optionalText(PLAN_MEMO_MAX),
  })
  // 끝이 시작보다 앞일 수 없다. 이정표는 날 하나라 끝을 보지 않는다(서버가 시작과 같게 맞춘다)
  .refine((v) => v.kind === "milestone" || !v.startOn || !v.endOn || v.endOn >= v.startOn, { path: ["endOn"], message: "period" })
  .refine((v) => v.parentId !== v.id, { path: ["parentId"], message: "self" });

export type PlanItemInput = z.infer<typeof planItemSchema>;

export const savePlanSchema = z.object({
  upsert: z.array(planItemSchema).max(PLAN_SAVE_MAX),
  deleted: z.array(z.uuid()).max(PLAN_SAVE_MAX),
});
export type SavePlanInput = z.infer<typeof savePlanSchema>;
