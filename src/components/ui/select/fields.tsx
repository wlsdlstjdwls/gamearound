"use client";
// 드롭다운의 두 쓰임 — 고르면 주소로 가는 `Select`, 폼 안에서 값만 고르는 `FormSelect`.
// 겉모습과 키보드는 ./core 의 SelectCore 하나다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectCore, type SelectChoice, type SelectOption, type SelectSize } from "./core";

/** 고르면 그 값의 주소로 옮겨 가는 드롭다운(필터, 정렬) */
export function Select({
  label,
  value,
  options,
  className,
  scroll = true,
  size = "sm",
  hideLabel = false,
  onNavigate,
}: {
  label: string;
  /** 이름표를 밖에서 더 크게 그린 자리(목록 필터 무리)는 감춘다. 낭독기 이름으로는 남는다 */
  hideLabel?: boolean;
  /** 주소로 가는 일을 대신 맡을 함수. 목록 필터는 화면을 먼저 바꾸고 간다(game-filters/optimistic) */
  onNavigate?: (href: string) => void;
  value: string;
  options: SelectOption[];
  className?: string;
  size?: SelectSize;
  /** 고른 뒤 맨 위로 올릴지. 제자리에서 거르는 자리(목록 필터)는 false */
  scroll?: boolean;
}) {
  const router = useRouter();
  return (
    <SelectCore
      label={label}
      hideLabel={hideLabel}
      selectedValue={value}
      options={options}
      className={className}
      size={size}
      onPick={(v) => {
        const opt = options.find((o) => o.value === v);
        if (!opt || opt.value === value) return;
        if (onNavigate) onNavigate(opt.href);
        else router.push(opt.href, { scroll });
      }}
    />
  );
}

/**
 * 폼 안에서 값을 하나 고르는 칸.
 *
 * 고른 값은 **감춘 input** 에 담긴다 — 서버 액션은 FormData 로 값을 받으므로,
 * 생김새가 무엇이든 폼 안에는 name 을 가진 칸이 하나 있어야 한다.
 */
export function FormSelect({
  name,
  label,
  hideLabel,
  options,
  defaultValue,
  value,
  onChange,
  className,
  size = "sm",
  disabled,
}: {
  name: string;
  label: string;
  hideLabel?: boolean;
  options: SelectChoice[];
  /** 스스로 값을 쥐는 모드의 첫 값 */
  defaultValue?: string;
  /** 바깥이 값을 쥐는 모드. 주면 이 값만 따른다(고른 값에 따라 옆 칸이 바뀌는 자리) */
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  size?: SelectSize;
  disabled?: boolean;
}) {
  const [self, setSelf] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? self;
  return (
    <>
      <input type="hidden" name={name} value={current} />
      <SelectCore
        label={label}
        hideLabel={hideLabel}
        selectedValue={current}
        options={options}
        onPick={(v) => {
          if (value === undefined) setSelf(v);
          onChange?.(v);
        }}
        className={className}
        size={size}
        disabled={disabled}
      />
    </>
  );
}
