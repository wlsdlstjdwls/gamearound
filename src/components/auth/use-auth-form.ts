"use client";
// 인증 폼 공용 훅 — zod 스키마로 클라이언트 즉시 검증(blur/입력 중) + 서버 액션 결과(fieldErrors) 병합 + 성공 시 이동.
// 서버 에러는 해당 필드를 다시 편집하기 전까지 유지된다. 제출 시 첫 오류 필드로 포커스.
import { useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import type { AuthActionState } from "@/app/(auth)/actions";
import { fieldErrorsOf } from "@/lib/auth/schemas";
import { useSession } from "@/components/auth/session-provider";

type Options<S extends z.ZodType> = {
  schema: S;
  /** FormData → 스키마 입력 (schemas.ts의 *InputFromForm) */
  toInput: (fd: FormData) => unknown;
  serverState: AuthActionState;
};

export function useAuthForm<S extends z.ZodType>({ schema, toInput, serverState }: Options<S>) {
  const router = useRouter();
  const session = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [editedSinceServer, setEditedSinceServer] = useState<Set<string>>(() => new Set());
  // 같은 에러가 연속으로 와도 shake가 다시 돌도록 카운터
  const [errorSerial, setErrorSerial] = useState(0);

  // 서버 응답이 새로 오면 "그 뒤 편집한 필드" 목록을 비운다 — effect가 아니라 렌더 중 이전 값과 비교해 동기 갱신
  const [prevServerState, setPrevServerState] = useState(serverState);
  if (prevServerState !== serverState) {
    setPrevServerState(serverState);
    setEditedSinceServer(new Set());
    if (serverState && !serverState.ok) setErrorSerial((n) => n + 1);
  }

  // 성공: 세션 갱신 → soft navigation(replace: 뒤로가기로 로그인 폼에 돌아오지 않게).
  // router.refresh()는 부르지 않는다 — push 직후 부르면 아직 커밋 전인 /sign-in 트리를 새 쿠키로 다시 그리고,
  // (auth)/layout 의 redirect 가 목적지를 덮어써 홈으로 튄다. 목적지는 어차피 새 쿠키로 RSC 요청된다.
  const navigating = Boolean(serverState?.ok);
  useEffect(() => {
    if (!serverState?.ok) return;
    const target = serverState.redirectTo;
    session.refresh().finally(() => router.replace(target));
  }, [serverState, router, session]);

  const validateAll = useCallback((): Record<string, string> => {
    const form = formRef.current;
    if (!form) return {};
    const parsed = schema.safeParse(toInput(new FormData(form)));
    return parsed.success ? {} : fieldErrorsOf(parsed.error);
  }, [schema, toInput]);

  const validateField = useCallback(
    (name: string) => {
      const all = validateAll();
      setClientErrors((prev) => {
        const next = { ...prev };
        if (all[name]) next[name] = all[name];
        else delete next[name];
        return next;
      });
    },
    [validateAll],
  );

  const onBlur = useCallback((e: FocusEvent<HTMLInputElement>) => validateField(e.currentTarget.name), [validateField]);

  const onChange = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      const name = e.currentTarget.name;
      setEditedSinceServer((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
      // 이미 에러가 떠 있는 필드는 입력 중에도 재검증해 고쳐지는 즉시 사라지게
      setClientErrors((prev) => {
        if (!(name in prev)) return prev;
        queueMicrotask(() => validateField(name));
        return prev;
      });
    },
    [validateField],
  );

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      const errors = validateAll();
      if (Object.keys(errors).length === 0) return; // 서버 액션 진행
      e.preventDefault();
      setClientErrors(errors);
      setErrorSerial((n) => n + 1);
      const first = Object.keys(errors)[0];
      const el = formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`);
      el?.focus();
    },
    [validateAll],
  );

  const errors: Record<string, string> = { ...clientErrors };
  if (serverState && !serverState.ok && serverState.fieldErrors) {
    for (const [k, v] of Object.entries(serverState.fieldErrors)) {
      if (!editedSinceServer.has(k) && !(k in errors)) errors[k] = v;
    }
  }
  const formError = serverState && !serverState.ok ? serverState.error ?? null : null;

  /** 각 <input>에 펼쳐 넣는 공통 핸들러 */
  const fieldProps = (name: string) => ({ name, onBlur, onChange, error: errors[name] ?? null });

  return { formRef, errors, formError, errorSerial, fieldProps, onSubmit, navigating };
}

/** Enter → 다음 필드 포커스 (IME 조합 중 제외). 마지막 필드는 기본 제출. 이벤트 핸들러 안에서 호출한다(렌더 중 ref 접근 금지) */
export function focusNextOnEnter(e: KeyboardEvent<HTMLInputElement>, next: RefObject<HTMLInputElement | null>): void {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  next.current?.focus();
}
