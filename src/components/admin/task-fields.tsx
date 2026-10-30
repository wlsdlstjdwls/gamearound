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
import { SCREEN_MESSAGES, TASK_CATEGORY_LABEL, TASK_MESSAGES, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import {
  BOARD_STATUSES,
  TASK_ASSIGNEE_ALL,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  type TaskAssignee,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/admin/tasks";

/** 분류 고르는 칸의 항목. 값이 다섯이라 세그먼트로 늘어놓으면 한 칸 폭에 안 들어간다 — 그래서 셀렉트다 */
const CATEGORY_CHOICES = TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABEL[c] }));

/** 입력칸 한 겹. 테두리를 안쪽 그림자로 두는 규칙은 TextField 와 같다(판 위의 판을 만들지 않는다) */
export const FIELD = cn(
  "w-full rounded-xl bg-surface px-3.5 py-2.5 text-[16px] leading-[1.55] text-ink outline-none placeholder:text-dim sm:text-[14.5px]",
  // 테두리는 line-strong 이다(2026-10-01, 사용자: "구분이 잘 안 돼 눈에 안 들어온다") — line 은 흰 판 위에서 칸 경계가 거의 안 보였다
  "shadow-[0_0_0_1px_var(--line-strong)] transition-[box-shadow] duration-base ease-standard",
  "focus:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
);

export const FIELD_LABEL = "mb-1 block text-[13.5px] font-semibold text-mut";

/**
 * 세그먼트(한 판 위에 칸이 서고 고른 칸만 브랜드 보라로 채워진다).
 * 처음엔 고른 칸을 흰 면으로 띄웠는데 회색 판 위 흰 칸은 대비가 약해 "뭐가 선택된지 구분이 안 된다" 는 말을 들었다(2026-10-01). 판 위 거르기 줄의 보기 세그먼트와 같은 모양이다 —
 * 같은 화면 안에서 "하나를 고르는 칸" 이 두 모양이면 둘이 다른 일을 하는 것처럼 읽힌다.
 */
export const SEGMENT = "flex gap-0.5 rounded-xl bg-surface-2 p-1";
/** 세그먼트의 칸. 라디오를 감싼 label 이면 :checked 로, 버튼이면 `on` 으로 뜬다 */
export const SEGMENT_ITEM = cn(
  "press tap flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-2 text-[14px] text-mut transition-colors duration-base hover:text-ink",
  "has-[:checked]:bg-acc has-[:checked]:font-semibold has-[:checked]:text-on-ink has-[:checked]:shadow-1",
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acc",
);
export const SEGMENT_ITEM_ON = "bg-acc font-semibold text-on-ink shadow-1";
/** 우선순위 높음을 고르면 빨강으로 채운다 — 카드 띠와 같은 색이라 "이건 급한 일" 이 고를 때부터 보인다 */
const SEGMENT_ITEM_URGENT = "has-[:checked]:bg-danger";

export function Field({
  label,
  hint,
  children,
  id,
  className,
  required,
}: {
  label: string;
  hint?: string;
  id: string;
  /** 비우면 저장할 수 없는 칸. 이름표 앞에 빨간 * — 관리자 폼 공통 Field(screen/layout)와 같은 표시다(2026-10-30 사용자 "필수여부 표기가 없다") */
  required?: boolean;
  /** 격자 안 자리(칸 수, 순서)를 바깥이 정할 때 */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className={FIELD_LABEL}>
        {required && (
          <span aria-hidden className="mr-0.5 text-danger">
            *
          </span>
        )}
        {label}
        {required && <span className="sr-only">{SCREEN_MESSAGES.required}</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12.5px] text-dim">{hint}</p>}
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

/**
 * 글 높이에 칸을 맞춘다. 높이를 비운 뒤 재야 줄었을 때도 따라 줄어든다(rows 가 바닥이다).
 *
 * 잰 값이 0 이면 높이를 쓰지 않는다(2026-10-12): 카드 팝업은 닫힌 <dialog>(display: none) 안에서 먼저 마운트되고
 * showModal 은 그 뒤 effect 에서 불린다. 그 순간 재면 scrollHeight 가 0 이라 칸이 0px 로 박혀 메모가 잘린 채 열렸다.
 * 그럴 땐 rows 높이를 그대로 두고 한 프레임 뒤(팝업이 열린 뒤) 한 번만 다시 잰다 — 계속 기다리면 닫힌 채 남은 칸이 프레임마다 돈다.
 */
function fitToContent(el: HTMLTextAreaElement | null, retry = true) {
  if (!el) return;
  if (el.getClientRects().length === 0) {
    if (retry) requestAnimationFrame(() => fitToContent(el, false));
    return;
  }
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** 제목 + 메모. 추가와 고치기가 함께 쓴다 — 기본값만 다르다 */
export function TaskBasicFields({ title, body }: { title?: string; body?: string | null }) {
  const id = useId();
  return (
    <>
      <Field id={`${id}-title`} label={TASK_MESSAGES.titleLabel} required>
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

      {/* 세 줄에서 시작해 적힌 글 높이만큼 늘어난다(2026-10-12, 사용자: "이미 입력된 메모가 가려져서 보기 힘들다").
          앞에는 세 줄에 멈추고 나머지를 칸 안 스크롤로 숨겨, 긴 메모는 손으로 칸을 늘려야 다 보였다.
          CSS field-sizing 은 사파리가 아직 못 따라와 높이를 직접 잰다 */}
      <Field id={`${id}-body`} label={TASK_MESSAGES.bodyLabel}>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={3}
          ref={fitToContent}
          onInput={(e) => fitToContent(e.currentTarget)}
          defaultValue={body ?? ""}
          placeholder={TASK_MESSAGES.bodyPlaceholder}
          className={cn(FIELD, "resize-y")}
        />
      </Field>
    </>
  );
}

/**
 * 팝업 안의 마디 — 본문 제목(SectionHead)보다 작다. 여기서 갈리는 건 화면이 아니라 일이다.
 * 마디 사이에 헤어라인을 긋고 제목을 잉크로 세운다(2026-10-01) — 앞서는 11.5px 흐린 제목뿐이라
 * 놓인 칸, 내용, 기록이 한 덩어리로 흘러 "어디까지가 무엇인지" 가 안 갈렸다.
 * 팝업(dialog)과 고치기 폼(edit-form)이 함께 쓴다 — 고치기 폼이 "내용" 마디 머리를 스스로 단다(놓인 칸 줄이 그 위에 서야 해서).
 */
export function TaskPart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-[14px] font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

/**
 * 한 줄에 눕는 이름표(놓인 칸, 분류). 좁은 화면은 둘이 위아래로 쌓이므로 폭을 맞춰 칸의 왼쪽 선을 세운다 —
 * 안 맞추면 "분류" 가 짧아 셀렉트가 세그먼트보다 왼쪽에서 시작한다
 */
export const INLINE_LABEL = "w-[52px] shrink-0 text-[14px] font-bold text-ink sm:w-auto";

/**
 * 분류. "없음" 이 없는 다섯 값이라 셀렉트다.
 * `inline` 은 고치기 팝업의 맨 윗줄(놓인 칸 옆)에 설 때다(2026-10-12, 사용자: "놓인 칸 줄었으니 옆에 분류를 두자").
 */
export function TaskCategoryField({ category, inline }: { category?: TaskCategory; inline?: boolean }) {
  const select = (
    <FormSelect name="category" label={TASK_MESSAGES.categoryLabel} hideLabel size="lg" options={CATEGORY_CHOICES} defaultValue={category ?? TASK_CATEGORIES[0]} />
  );
  if (inline) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className={INLINE_LABEL}>
          {TASK_MESSAGES.categoryLabel}
        </span>
        <div className="min-w-0 flex-1 sm:w-[180px] sm:flex-none">{select}</div>
      </div>
    );
  }
  // 셀렉트는 라벨을 스스로 단다(버튼에 aria 로 잇는다). 눈에 보이는 라벨만 Field 와 같은 모양으로 따로 세운다
  return (
    <div className="min-w-0">
      <span aria-hidden className={FIELD_LABEL}>
        {TASK_MESSAGES.categoryLabel}
      </span>
      {select}
    </div>
  );
}

export function TaskPriorityField({ priority, className }: { priority?: TaskPriority; className?: string }) {
  const id = useId();
  return (
    <Field id={`${id}-priority`} label={TASK_MESSAGES.priorityLabel} className={className}>
      <RadioSegment
        id={`${id}-priority`}
        name="priority"
        values={TASK_PRIORITIES}
        labels={TASK_PRIORITY_LABEL}
        defaultValue={priority ?? "normal"}
        itemClass={{ high: SEGMENT_ITEM_URGENT }}
      />
    </Field>
  );
}

/**
 * 담당자. 칩 줄에서 셀렉트로 바꿨다(2026-10-01) — 칩은 한 줄을 통째로 먹었고 관리자가 늘면 줄바꿈으로 더 커진다.
 * "없음" 은 빈 문자열로 보낸다 — 서버가 그걸 "아무도 안 쥐었다" 로 읽는다.
 */
export function TaskAssigneeField({ assignees, assigneeId, className }: { assignees: TaskAssignee[]; assigneeId?: string | null; className?: string }) {
  // "모두" 는 "없음" 바로 뒤 — 사람 이름보다 앞에 둬야 관리자가 늘어도 자리가 안 바뀐다
  const assigneeChoices = [
    { value: "", label: TASK_MESSAGES.assigneeNone },
    { value: TASK_ASSIGNEE_ALL, label: TASK_MESSAGES.assigneeAll },
    ...assignees.map((a) => ({ value: a.id, label: a.name })),
  ];
  return (
    <div className={cn("min-w-0", className)}>
      <span aria-hidden className={FIELD_LABEL}>
        {TASK_MESSAGES.assigneeLabel}
      </span>
      <FormSelect name="assigneeId" label={TASK_MESSAGES.assigneeLabel} hideLabel size="lg" options={assigneeChoices} defaultValue={assigneeId ?? ""} />
    </div>
  );
}

/** 분류 + 우선순위 + 담당자 — 추가 팝업이 쓴다. 고치기 팝업은 분류를 맨 윗줄로 올려 셋을 따로 놓는다(edit-form) */
export function TaskMetaFields({ assignees }: { assignees: TaskAssignee[] }) {
  return (
    // 좁은 화면은 두 줄이다(2026-10-02, 사용자: "모바일 할일 상세는 컴팩트화가 덜 됐다") — 셀렉트 둘이 한 줄에 나란히 서고,
    // 값이 셋인 우선순위 세그먼트만 아래 한 줄을 다 쓴다(반 폭에선 낱말이 꺾인다)
    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 sm:grid-cols-3 sm:gap-x-3">
      <TaskCategoryField />
      <TaskPriorityField className="order-last col-span-2 sm:order-none sm:col-span-1" />
      <TaskAssigneeField assignees={assignees} />
    </div>
  );
}

/** 놓을 칸 고르기. 추가 팝업에서만 쓴다 — 이미 있는 카드는 칸을 옮기면 자취가 남아야 해서 제 액션을 탄다 */
export function TaskStatusField({ defaultValue = "todo" }: { defaultValue?: TaskStatus }) {
  const id = useId();
  return (
    <Field id={id} label={TASK_MESSAGES.statusLabel}>
      <RadioSegment id={id} name="status" values={BOARD_STATUSES} labels={TASK_STATUS_LABEL} defaultValue={defaultValue} />
    </Field>
  );
}
