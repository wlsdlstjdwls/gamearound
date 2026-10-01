"use client";
// 할 일 폼의 칸 모양. 추가 팝업과 고치기 폼이 **같은 칸**을 쓴다.
//
// 뽑아낸 이유(AGENTS §3): 같은 입력이 두 곳에 생겼고, 그 둘이 이미 어긋나 있었다 —
// 추가 폼은 라벨이 보이는 16px 칸, 카드 안 고치기 폼은 라벨 없는 12.5px 칸이었다.
// 그래서 "추가할 때는 보이던 급함 고르는 칸이 고칠 때는 어디 갔지" 가 생긴다.
//
// 입력 글자는 16px 다 — 이보다 작으면 iOS 가 포커스에서 화면을 확대한다(AGENTS §6).
// 넓은 화면에서만 13.5px 로 줄인다.
import { useId } from "react";
import { cn } from "@/lib/cn";
import { FormSelect } from "@/components/ui/select";
import { TASK_CATEGORY_LABEL, TASK_MESSAGES, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskAssignee,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/admin/tasks";

/** 갈래 고르는 칸의 항목. 값이 다섯이라 칩으로 늘어놓으면 급함 줄과 두 줄이 같은 모양으로 겹쳐 읽힌다 — 그래서 셀렉트다 */
const CATEGORY_CHOICES = TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABEL[c] }));

/** 입력칸 한 겹. 테두리를 안쪽 그림자로 두는 규칙은 TextField 와 같다(판 위의 판을 만들지 않는다) */
export const FIELD = cn(
  "w-full rounded-xl bg-surface px-3.5 py-3 text-[16px] leading-[1.55] text-ink outline-none placeholder:text-dim sm:text-[13.5px]",
  "shadow-[0_0_0_1px_var(--line)] transition-[box-shadow] duration-base ease-standard",
  "focus:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
);

/** 한 줄 칩으로 고르는 라디오(급함, 담당자, 놓을 칸). 셋이 같은 모양이어야 한 폼으로 읽힌다 */
const RADIO_CHIP = cn(
  "bg-surface text-mut shadow-[0_0_0_1px_var(--line)] hover:text-ink",
  "has-[:checked]:bg-acc has-[:checked]:font-semibold has-[:checked]:text-on-ink has-[:checked]:shadow-none",
  "has-[:focus-visible]:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
);

export const FIELD_LABEL = "mb-1.5 block text-[12.5px] font-medium text-mut";

export function Field({ label, hint, children, id }: { label: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] text-dim">{hint}</p>}
    </div>
  );
}

/** 제목 + 분류 + 메모 + 급함. 추가와 고치기가 함께 쓴다 — 기본값만 다르다 */
export function TaskBasicFields({
  title,
  body,
  priority,
  category,
}: {
  title?: string;
  body?: string | null;
  priority?: TaskPriority;
  category?: TaskCategory;
}) {
  const id = useId();
  return (
    <>
      <Field id={`${id}-title`} label={TASK_MESSAGES.titleLabel}>
        <input
          id={`${id}-title`}
          name="title"
          defaultValue={title}
          maxLength={200}
          required
          autoComplete="off"
          placeholder={TASK_MESSAGES.titlePlaceholder}
          className={FIELD}
        />
      </Field>

      {/* 라벨은 FormSelect 가 스스로 단다(버튼에 aria 로 이어 둔다) — Field 로 감싸면 라벨이 둘이 된다 */}
      <FormSelect
        name="category"
        label={TASK_MESSAGES.categoryLabel}
        options={CATEGORY_CHOICES}
        defaultValue={category ?? TASK_CATEGORIES[0]}
        size="lg"
      />

      <Field id={`${id}-body`} label={TASK_MESSAGES.bodyLabel}>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={4}
          defaultValue={body ?? ""}
          placeholder={TASK_MESSAGES.bodyPlaceholder}
          className={cn(FIELD, "resize-y")}
        />
      </Field>

      <Field id={`${id}-priority`} label={TASK_MESSAGES.priorityLabel}>
        {/* 급함은 세 값뿐이라 드롭다운을 열 이유가 없다 — 한 줄에 다 서면 고르는 데 한 번이면 된다 */}
        <div className="flex gap-1.5">
          {TASK_PRIORITIES.map((p, i) => (
            <label
              key={p}
              className={cn(
                "press flex min-h-[var(--touch-target)] flex-1 cursor-pointer items-center justify-center rounded-xl text-[13.5px] transition-colors",
                RADIO_CHIP,
              )}
            >
              <input
                type="radio"
                name="priority"
                value={p}
                id={i === 0 ? `${id}-priority` : undefined}
                defaultChecked={(priority ?? "normal") === p}
                className="sr-only"
              />
              {TASK_PRIORITY_LABEL[p]}
            </label>
          ))}
        </div>
      </Field>
    </>
  );
}

/**
 * 담당자 고르기(2026-09-30). 급함과 같은 한 줄 칩이다 — 후보가 관리자 계정뿐이라 몇 안 되고,
 * 드롭다운을 열면 고르는 데 두 번이 든다. 넘치면 줄을 바꿔 선다.
 * "없음" 은 빈 문자열로 보낸다 — 서버가 그걸 "아무도 안 쥐었다" 로 읽는다.
 */
export function TaskAssigneeField({ assignees, defaultValue }: { assignees: TaskAssignee[]; defaultValue?: string | null }) {
  const id = useId();
  const choices = [{ id: "", name: TASK_MESSAGES.assigneeNone }, ...assignees];
  return (
    <Field id={id} label={TASK_MESSAGES.assigneeLabel}>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((a, i) => (
          <label
            key={a.id || "none"}
            className={cn(
              "press flex min-h-[var(--touch-target)] flex-1 cursor-pointer items-center justify-center rounded-xl px-3 text-[13.5px] transition-colors",
              RADIO_CHIP,
            )}
          >
            <input
              type="radio"
              name="assigneeId"
              value={a.id}
              id={i === 0 ? id : undefined}
              defaultChecked={(defaultValue ?? "") === a.id}
              className="sr-only"
            />
            {a.name}
          </label>
        ))}
      </div>
    </Field>
  );
}

/** 놓을 칸 고르기. 추가 팝업에서만 쓴다 — 이미 있는 카드는 칸을 옮기면 자취가 남아야 해서 제 액션을 탄다 */
export function TaskStatusField({ defaultValue = "todo" }: { defaultValue?: TaskStatus }) {
  const id = useId();
  return (
    <Field id={id} label={TASK_MESSAGES.statusLabel}>
      <div className="flex flex-wrap gap-1.5">
        {TASK_STATUSES.map((s, i) => (
          <label
            key={s}
            className={cn(
              "press flex min-h-[var(--touch-target)] flex-1 cursor-pointer items-center justify-center rounded-xl px-3 text-[13.5px] transition-colors",
              RADIO_CHIP,
            )}
          >
            <input type="radio" name="status" value={s} id={i === 0 ? id : undefined} defaultChecked={defaultValue === s} className="sr-only" />
            {TASK_STATUS_LABEL[s]}
          </label>
        ))}
      </div>
    </Field>
  );
}
