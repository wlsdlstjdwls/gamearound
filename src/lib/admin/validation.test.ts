import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrors, firstError, hasErrorUnder, VALIDATION_MESSAGES as V } from "@/lib/admin/validation";

const schema = z
  .object({
    name: z.string().trim().min(1).max(5),
    rate: z.number().int().min(1).max(90),
    items: z.array(z.object({ amount: z.number().int().min(100) })),
    from: z.string(),
    to: z.string(),
  })
  .refine((v) => v.from <= v.to, { path: ["to"] });

describe("fieldErrors", () => {
  it("맞으면 비어 있다", () => {
    expect(fieldErrors(schema.safeParse({ name: "a", rate: 10, items: [], from: "1", to: "2" }))).toEqual({});
  });
  it("비율 상한을 넘으면 그 칸에 상한을 말한다", () => {
    const e = fieldErrors(schema.safeParse({ name: "a", rate: 120, items: [], from: "1", to: "2" }));
    expect(e).toEqual({ rate: V.max(90) });
  });
  it("빈 글, 긴 글, 작은 값, 정수 아님을 가른다", () => {
    expect(fieldErrors(schema.safeParse({ name: "", rate: 1.5, items: [{ amount: 50 }], from: "1", to: "2" }))).toEqual({ name: V.required, rate: V.integer, "items.0.amount": V.min(100) });
    expect(fieldErrors(schema.safeParse({ name: "abcdef", rate: 1, items: [], from: "1", to: "2" }))).toEqual({ name: V.maxLength(5) });
  });
  it("refine 경로는 부르는 쪽 문구로 덮는다", () => {
    const e = fieldErrors(schema.safeParse({ name: "a", rate: 1, items: [], from: "3", to: "2" }), { to: "종료일이 시작일보다 앞이에요" });
    expect(e).toEqual({ to: "종료일이 시작일보다 앞이에요" });
  });
  it("줄 단위 표시와 첫 오류", () => {
    const e = { "items.0.amount": "x", name: "y" };
    expect(hasErrorUnder(e, "items.0")).toBe(true);
    expect(hasErrorUnder(e, "items.1")).toBe(false);
    expect(firstError(e)).toEqual({ path: "items.0.amount", message: "x" });
    expect(firstError({})).toBeNull();
  });
});
