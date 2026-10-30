"use client";
// 공용 텍스트 입력 — 라벨/힌트/에러 연결(aria-describedby), 포커스 링, 우측 슬롯(비밀번호 토글 등).
// 에러는 등장 시 rise 애니메이션, 필드는 살짝 흔들림(shake). React 19: ref는 일반 prop.
// 값이 칸보다 길어 잘려 보이면 칸 위에 올렸을 때 전체 값을 말풍선으로 띄운다(2026-10-30 사용자 "폼 필드들도 툴팁, 공통화").
// 그리드 셀(Clamp)과 같은 말풍선이다. 말풍선은 칸 상자에 건다 — input 의 ref 는 부르는 쪽 몫이라 합치지 않고 상자 안에서 input 을 찾는다.
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";
import { useTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { AlertCircleIcon } from "@/components/ui/icons";

export type TextFieldProps = Omit<ComponentProps<"input">, "size"> & {
  label: string;
  /** 라벨을 화면에서 숨기고 스크린리더에만 */
  hideLabel?: boolean;
  hint?: ReactNode;
  /**
   * 칸 바로 밑에 붙는 자리(비밀번호 강도 막대). 안내 줄(hint)과 달리 오류가 떠도 사라지지 않는다 —
   * 오류가 안내 줄을 밀어내면 막대도 같이 사라져, 고쳐 치는 동안 나아지는지 볼 수 없었다(2026-10-30 사용자)
   */
  under?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
  /** 칸 왼쪽 고정 글자(주소 앞부분 등). 값이 아니라 보여 주기만 한다 — 입력값에 섞이지 않는다 */
  leading?: ReactNode;
  /** 이름표 바로 뒤에 붙는 표시(필수 칸의 RequiredMark, components/ui/required-mark). 이름표 안에 서서 칸 이름과 함께 읽힌다 */
  labelMark?: ReactNode;
  /** 이름표 줄 오른쪽 끝 짧은 글(규칙, 글자 수). 칸 아래 힌트 줄을 따로 쓰지 않아 세로가 준다 */
  aside?: ReactNode;
  /** 44px 칸(터치 타깃 하한). 칸이 많은 폼에서 세로를 줄인다. 글자는 16px 그대로(iOS 확대 방지) */
  compact?: boolean;
  /** 칸 바로 밑에 뜨는 판(제안 목록, components/ui/suggest). 칸 상자를 기준으로 선다 */
  popup?: ReactNode;
  /**
   * 넓은 화면에서 이름표를 칸 왼쪽에 세운다(2026-10-29, 관리자 설정 폼). 칸이 열 개 넘는 폼은 이름표가 칸 위에 서면
   * 칸 하나가 세 줄(이름, 칸, 도움말)이라 세로로 끝없이 길어졌다. 백오피스 상세 폼처럼 이름은 왼쪽, 칸과 도움말은 오른쪽이다.
   * 이름표 폭은 --field-label-w 로 바꾼다(기본 112px). 좁은 화면은 그대로 위에 선다
   */
  labelSide?: boolean;
  wrapperClassName?: string;
};

export function TextField({ label, labelMark, hideLabel, hint, under, error, leading, aside, compact = false, trailing, popup, labelSide = false, wrapperClassName, className, id: idProp, ...input }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const [overflow, setOverflow] = useState<string | null>(null);
  const { triggerProps, tooltip } = useTooltip<HTMLDivElement>(overflow ?? "", overflow !== null);
  const box = triggerProps.ref;

  // 잘림 판정. 값이 바뀌거나(제어, 비제어 모두 input 이벤트를 듣는다) 폭이 바뀌면 다시 잰다
  useEffect(() => {
    const el = box.current?.querySelector("input");
    if (!el) return;
    const check = () => setOverflow(el.value && el.scrollWidth > el.clientWidth + 1 ? el.value : null);
    check();
    el.addEventListener("input", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("input", check);
      ro.disconnect();
    };
  }, [box, input.value]);

  return (
    <div className={cn("group/field", labelSide && "sm:grid sm:grid-cols-[var(--field-label-w,112px)_minmax(0,1fr)] sm:items-start sm:gap-x-3", wrapperClassName)}>
      <div className={cn("mb-1.5 flex items-baseline justify-between gap-2", labelSide && "sm:row-span-2 sm:mb-0 sm:pt-3", hideLabel && "sr-only")}>
        <label htmlFor={id} className="block text-[12.5px] font-medium text-mut transition-colors group-focus-within/field:text-ink">
          {label}
          {labelMark}
        </label>
        {aside && (
          <span id={`${id}-aside`} className="text-[11.5px]">
            {aside}
          </span>
        )}
      </div>
      <div
        {...triggerProps}
        className={cn(
          // key 를 붙이지 않는다(2026-09-23). 예전에는 key={invalid ? "invalid" : "valid"} 로 shake 를 다시 태웠는데,
          // key 가 바뀌면 이 div 와 **안의 <input> 이 통째로 새로 만들어진다** — 치던 값이 날아갔다.
          // 오류가 뜰 때(blur)도, 오류를 고치는 중에 오류가 사라질 때도 칸이 비었다.
          // shake 는 key 없이도 정상이다: animate-shake 가 없다가 붙는 순간 애니메이션이 처음부터 돈다.
          // (같은 칸에 다른 오류가 이어 뜨는 경우는 key 가 있던 시절에도 "invalid" 로 같아서 replay 가 없었다)
          //
          // 테두리를 실제 border 가 아니라 안쪽 그림자로 두는 이유(2026-09-21 리디자인):
          // 입력칸이 채운 판(--surface-2) 위에 서는 자리라 흰 면이 곧 "쓸 수 있는 칸" 이고,
          // 거기에 1px 선까지 더하면 판 안의 판이 된다. 선은 포커스와 오류에서만 말한다
          "relative flex items-center rounded-xl bg-surface transition-[box-shadow] duration-base ease-standard",
          // 잠긴 칸(disabled)은 읽기 전용 칸(관리자 ReadValue)과 같은 회색 면 — 흰 칸이면 고칠 수 있는 칸으로 읽혔다(2026-10-30 진행 중 프로모션 잠금)
          "has-[input:disabled]:bg-surface-2 has-[input:disabled]:shadow-none",
          "shadow-[0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
          invalid && "animate-shake shadow-[0_0_0_1px_var(--danger)] focus-within:shadow-[0_0_0_1px_var(--danger)]",
        )}
      >
        {leading && <span className="shrink-0 pl-3.5 text-[15px] text-dim select-none">{leading}</span>}
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={[aside ? `${id}-aside` : null, hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined}
          className={cn(
            // 글자 16px 은 취향이 아니라 규약이다(AGENTS.md §6) — iOS 사파리는 16px 미만 입력칸에
            // 포커스가 가면 화면을 확대하고, 확대된 배율은 입력을 마쳐도 돌아오지 않는다.
            // 14px 이던 값을 올렸다(2026-09-22 실측: 로그인, 가입의 모든 칸이 14px 이었다).
            // 높이는 46px 그대로라 줄 위치는 밀리지 않는다 — 글자만 커진다.
            compact ? "h-11 min-h-11" : "h-[46px] min-h-[46px]",
            "w-full min-w-0 flex-1 bg-transparent px-3.5 text-[16px] text-ink outline-none placeholder:text-dim disabled:cursor-not-allowed disabled:text-mut",
            leading ? "pl-0.5" : null,
            "autofill:shadow-[inset_0_0_0_1000px_var(--surface)] autofill:[-webkit-text-fill-color:var(--ink)]",
            className,
          )}
          {...input}
        />
        {trailing && <div className="flex shrink-0 items-center pr-1.5">{trailing}</div>}
        {popup}
      </div>
      {tooltip}
      {under && <div className={cn("mt-2", labelSide && "sm:col-start-2")}>{under}</div>}
      {invalid ? (
        <p id={errorId} role="alert" className={cn("mt-1.5 flex items-start gap-1 text-xs text-danger animate-rise", labelSide && "sm:col-start-2")}>
          <AlertCircleIcon size={14} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={hintId} className={cn("mt-1.5 text-xs text-dim", labelSide && "sm:col-start-2")}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * 여러 줄 입력칸 모양. 입점 신청과 인디 홍보 글이 같이 쓴다(AGENTS §3). 글자 16px 은 iOS 확대 방지(AGENTS §6).
 * 한 줄 칸(TextField)과 같은 얼굴이다 — 흰 면 + 안쪽 그림자 테두리, 포커스에 보라 링(2026-10-12).
 * 예전에는 회청 면 + 진한 1px 테두리라 같은 폼 안에서 혼자 다른 물건처럼 보였다.
 */
export const TEXTAREA_CLASS =
  "block w-full resize-y rounded-xl bg-surface px-3.5 py-3 text-[16px] leading-[1.7] text-ink outline-none placeholder:text-dim shadow-[0_0_0_1px_var(--line)] transition-[box-shadow] duration-base ease-standard focus:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]";
