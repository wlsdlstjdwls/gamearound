"use client";
// 할 일 폼의 칸 모양. 추가 팝업과 고치기 폼이 **같은 칸**을 쓴다.
//
// 뽑아낸 이유(AGENTS §3): 같은 입력이 두 곳에 생겼고, 그 둘이 이미 어긋나 있었다 —
// 추가 폼은 라벨이 보이는 16px 칸, 카드 안 고치기 폼은 라벨 없는 12.5px 칸이었다.
// 그래서 "추가할 때는 보이던 급함 고르는 칸이 고칠 때는 어디 갔지" 가 생긴다.
//
// **조밀하게 다시 짰다**(2026-10-01, 사용자: "입력하는 건 많지 않은데 너무 많은 영역을 차지한다").
// 앞서는 분류, 급함, 담당자가 저마다 한 줄을 통째로 쓰고 고르는 칸이 44px 큰 버튼이라, 값 셋 고르는 데
// 팝업 높이의 절반이 들었다. 지금은 셋이 한 줄에 나란히 서고(TaskMetaFields), 고르는 칸은 거르기 줄과 같은
// 낮은 세그먼트다. 손가락 기기에서는 `.tap` 이 44px 로 되돌린다(globals.css) — 조밀함은 마우스 화면 몫이다.
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

/** 분류 고르는 칸의 항목. 값이 다섯이라 세그먼트로 늘어놓으면 한 칸 폭에 안 들어간다 — 그래서 셀렉트다 */
const CATEGORY_CHOICES = TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABEL[c] }));

/** 입력칸 한 겹. 테두리를 안쪽 그림자로 두는 규칙은 TextField 와 같다(판 위의 판을 만들지 않는다) */
export const FIELD = cn(
  "w-full rounded-xl bg-surface px-3.5 py-2.5 text-[16px] leading-[1.55] text-ink outline-none placeholder:text-dim sm:text-[13.5px]",
  // 테두리는 line-strong 이다(2026-10-01, 사용자: "구분이 잘 안 돼 눈에 안 들어온다") — line 은 흰 판 위에서 칸 경계가 거의 안 보였다
  "shadow-[0_0_0_1px_var(--line-strong)] transition-[box-shadow] duration-base ease-standard",
  "focus:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
);

export const FIELD_LABEL = "mb-1.5 block text-[12.5px] font-semibold text-mut";

/**
 * 세그먼트(한 판 위에 칸이 서고 고른 칸만 브랜드 보라로 채워진다).
 * 처음엔 고른 칸을 흰 면으로 띄웠는데 회색 판 위 흰 칸은 대비가 약해 "뭐가 선택된지 구분이 안 된다" 는 말을 들었다(2026-10-01). 판 위 거르기 줄의 보기 세그먼트와 같은 모양이다 —
 * 같은 화면 안에서 "하나를 고르는 칸" 이 두 모양이면 둘이 다른 일을 하는 것처럼 읽힌다.
 */
export const SEGMENT = "flex gap-0.5 rounded-xl bg-surface-2 p-1";
/** 세그먼트의 칸. 라디오를 감싼 label 이면 :checked 로, 버튼이면 `on` 으로 뜬다 */
export const SEGMENT_ITEM = cn(
  "press tap flex h-7 min-w-0 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-2 text-[13px] text-mut transition-colors duration-base hover:text-ink",
  "has-[:checked]:bg-acc has-[:checked]:font-semibold has-[:checked]:text-on-ink has-[:checked]:shadow-1",
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acc",
);
export const SEGMENT_ITEM_ON = "bg-acc font-semibold text-on-ink shadow-1";
/** 우선순위 높음을 고르면 빨강으로 채운다 — 카드 띠와 같은 색이라 "이건 급한 일" 이 고를 때부터 보인다 */
const SEGMENT_ITEM_URGENT = "has-[:checked]:bg-danger";

export function Field({ label, hint, children, id }: { label: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] text-dim">{hint}</p>}
    </div>
  );
}

/** 라디오 세그먼트 한 줄. 급함과 놓을 칸이 쓴다 */
function RadioSegment<T extends string>({
  id,
  name,
  values,
  labels,
  defaultValue,
  itemClass,
}: {
  id: string;
  name: string;
  values: readonly T[];
  labels: Record<T, string>;
  defaultValue: T;
  /** 값마다 덧붙일 모양(고른 색을 바꿀 때) */
  itemClass?: Partial<Record<T, string>>;
}) {
  return (
    <div className={SEGMENT}>
      {values.map((v, i) => (
        <label key={v} className={cn(SEGMENT_ITEM, itemClass?.[v])}>
          <input type="radio" name={name} value={v} id={i === 0 ? id : undefined} defaultChecked={defaultValue === v} className="sr-only" />
          {labels[v]}
        </label>
      ))}
    </div>
  );
}

/** 제목 + 메모. 추가와 고치기가 함께 쓴다 — 기본값만 다르다 */
export function TaskBasicFields({ title, body }: { title?: string; body?: string | null }) {
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

      {/* 세 줄이다 — 메모는 배경 한두 줄이 대부분이고, 길면 칸이 스스로 늘어난다(resize-y) */}
      <Field id={`${id}-body`} label={TASK_MESSAGES.bodyLabel}>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={3}
          defaultValue={body ?? ""}
          placeholder={TASK_MESSAGES.bodyPlaceholder}
          className={cn(FIELD, "resize-y")}
        />
      </Field>
    </>
  );
}

/**
 * 분류 + 급함 + 담당자 — 한 줄에 셋. 좁은 화면에서는 세로로 쌓인다.
 *
 * 담당자를 칩 줄에서 셀렉트로 바꿨다(2026-10-01). 칩은 한 번에 고르는 대신 한 줄을 통째로 먹었고,
 * 관리자가 늘면 줄바꿈으로 더 커진다. "없음" 은 빈 문자열로 보낸다 — 서버가 그걸 "아무도 안 쥐었다" 로 읽는다.
 */
export function TaskMetaFields({
  assignees,
  category,
  priority,
  assigneeId,
}: {
  assignees: TaskAssignee[];
  category?: TaskCategory;
  priority?: TaskPriority;
  assigneeId?: string | null;
}) {
  const id = useId();
  const assigneeChoices = [{ value: "", label: TASK_MESSAGES.assigneeNone }, ...assignees.map((a) => ({ value: a.id, label: a.name }))];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {/* 셀렉트는 라벨을 스스로 단다(버튼에 aria 로 잇는다). 눈에 보이는 라벨만 Field 와 같은 모양으로 따로 세운다 */}
      <div className="min-w-0">
        <span aria-hidden className={FIELD_LABEL}>
          {TASK_MESSAGES.categoryLabel}
        </span>
        <FormSelect name="category" label={TASK_MESSAGES.categoryLabel} hideLabel options={CATEGORY_CHOICES} defaultValue={category ?? TASK_CATEGORIES[0]} />
      </div>

      <Field id={`${id}-priority`} label={TASK_MESSAGES.priorityLabel}>
        <RadioSegment
          id={`${id}-priority`}
          name="priority"
          values={TASK_PRIORITIES}
          labels={TASK_PRIORITY_LABEL}
          defaultValue={priority ?? "normal"}
          itemClass={{ high: SEGMENT_ITEM_URGENT }}
        />
      </Field>

      <div className="min-w-0">
        <span aria-hidden className={FIELD_LABEL}>
          {TASK_MESSAGES.assigneeLabel}
        </span>
        <FormSelect name="assigneeId" label={TASK_MESSAGES.assigneeLabel} hideLabel options={assigneeChoices} defaultValue={assigneeId ?? ""} />
      </div>
    </div>
  );
}

/** 놓을 칸 고르기. 추가 팝업에서만 쓴다 — 이미 있는 카드는 칸을 옮기면 자취가 남아야 해서 제 액션을 탄다 */
export function TaskStatusField({ defaultValue = "todo" }: { defaultValue?: TaskStatus }) {
  const id = useId();
  return (
    <Field id={id} label={TASK_MESSAGES.statusLabel}>
      <RadioSegment id={id} name="status" values={TASK_STATUSES} labels={TASK_STATUS_LABEL} defaultValue={defaultValue} />
    </Field>
  );
}
