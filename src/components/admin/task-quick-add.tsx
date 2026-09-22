"use client";

// 칸 안에서 바로 적는 한 줄 추가(2026-09-22).
//
// 왜 팝업과 따로 두나: 할 일의 거의 전부는 "제목 한 줄" 로 시작한다. 그 한 줄을 적자고
// 버튼을 누르고 팝업이 뜨기를 기다리고 칸을 고르고 저장을 누르면, 생각난 일을 적는 데 네 동작이 든다.
// 여기서는 칸을 누르고 치고 엔터다 — 칸은 이미 골라져 있다(누른 칸이 그 칸이다).
// 나머지(메모, 급함, 붙인 대상)는 나중에 카드를 열어 채운다. 팝업은 그대로 남는다 —
// 처음부터 자세히 적을 일도 있고, 그때는 이 한 줄칸이 너무 좁다.
//
// **성공해도 닫지 않는다**: 할 일은 한 번에 여러 개가 떠오른다. 저장하면 칸만 비우고 포커스를 남겨
// 다음 줄을 곧바로 치게 한다. 빈 칸에서 엔터나 Esc 를 누르면 그때 닫는다.
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import type { TaskStatus } from "@/lib/admin/tasks";
import { createTaskAction } from "@/app/(admin)/admin/tasks/actions";

export function TaskQuickAdd({ status }: { status: TaskStatus }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const el = boxRef.current;
    if (!el) return;
    const title = el.value.trim();
    // 빈 칸에서의 엔터는 "다 적었다" 는 뜻이다
    if (!title) {
      setOpen(false);
      return;
    }
    const form = new FormData();
    form.set("title", title);
    form.set("status", status);
    start(async () => {
      const res = await createTaskAction(null, form);
      if (res?.ok) {
        el.value = "";
        el.focus();
        setError(null);
        return;
      }
      setError(res && !res.ok ? res.error : TASK_MESSAGES.invalid);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          // 열리는 그 렌더에서는 아직 칸이 없다 — 다음 프레임에 잡는다
          requestAnimationFrame(() => boxRef.current?.focus());
        }}
        className="press flex w-full items-center gap-1.5 rounded-[10px] border border-dashed border-line px-2.5 py-2 text-[12px] text-dim transition-colors hover:border-acc hover:text-acc"
      >
        <span aria-hidden className="text-[14px] leading-none">
          +
        </span>
        {TASK_MESSAGES.quickAdd}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        ref={boxRef}
        rows={2}
        maxLength={200}
        disabled={pending}
        placeholder={TASK_MESSAGES.quickAddPlaceholder}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key !== "Enter" || e.shiftKey) return;
          // 한글을 조합하는 중의 엔터는 글자를 확정하는 엔터다 — 이것까지 가로채면
          // "칸반" 을 치다 ㄴ 에서 저장되어 "칸바"만 남는다
          if (e.nativeEvent.isComposing) return;
          e.preventDefault();
          submit();
        }}
        onBlur={() => {
          if (boxRef.current?.value.trim()) return;
          setOpen(false);
        }}
        className={cn(
          "w-full resize-none rounded-[10px] bg-surface px-2.5 py-2 text-[16px] leading-[1.5] text-ink outline-none placeholder:text-dim sm:text-[12.5px]",
          "shadow-[0_0_0_1px_var(--line)] transition-[box-shadow] duration-base ease-standard",
          "focus:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
          pending && "opacity-60",
        )}
      />
      <p className="px-0.5 text-[10.5px] text-dim">{TASK_MESSAGES.quickAddHint}</p>
      {error && (
        <p role="alert" className="px-0.5 text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
