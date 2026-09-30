"use client";
// 인증 폼 공용 훅 — zod 스키마로 클라이언트 즉시 검증(blur/입력 중) + 서버 액션 결과(fieldErrors) 병합 + 성공 시 이동.
// 서버 에러는 해당 필드를 다시 편집하기 전까지 유지된다. 제출 시 첫 오류 필드로 포커스.
import { startTransition, useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent, type RefObject } from "react";
import type { z } from "zod";
import type { AuthActionState } from "@/app/(auth)/actions";
import { fieldErrorsOf } from "@/lib/auth/schemas";

type Options<S extends z.ZodType> = {
  schema: S;
  /** FormData → 스키마 입력 (schemas.ts의 *InputFromForm) */
  toInput: (fd: FormData) => unknown;
  serverState: AuthActionState;
  /** useActionState 가 준 액션. <form action> 에 걸지 말고 이 훅에 넘긴다 — 이유는 onSubmit 주석 */
  submit: (formData: FormData) => void;
  /**
   * 칸을 떠날 때 서버에 묻는 확인(가입의 이메일 중복 등). 오류 문구를 돌려주고, 문제없거나 답을 못 하면 null.
   * onBlur 가 이 참조에 매여 있으니 렌더마다 새로 만들지 말고 모듈 상수로 넘긴다.
   */
  remoteChecks?: Readonly<Record<string, (value: string) => Promise<string | null>>>;
};

export function useAuthForm<S extends z.ZodType>({ schema, toInput, serverState, submit, remoteChecks }: Options<S>) {
  const formRef = useRef<HTMLFormElement>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  // onBlur 가 지금 떠 있는 오류를 보려고 둔다 — state 를 의존성에 넣으면 칸마다 핸들러가 매번 새로 생긴다
  const clientErrorsRef = useRef(clientErrors);
  useEffect(() => {
    clientErrorsRef.current = clientErrors;
  }, [clientErrors]);
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

  /*
   * 성공하면 **문서를 통째로 새로 연다**(soft navigation 이 아니다).
   *
   * 예전에는 `session.refresh()` 로 헤더를 고치고 `router.replace()` 로 부드럽게 넘어갔다.
   * 그런데 로그인은 됐는데 머리글만 "로그인" 버튼으로 남는 일이 반복됐다(2026-09-21 실측:
   * 서버는 세션을 주는데 머리글은 비로그인, 새로고침하면 곧바로 정상). 부드러운 이동은 성공을
   * **두 조각**에 나눠 맡긴다 — 새 쿠키가 붙는 시점과 클라이언트 상태를 고치는 요청이 따로 돌고,
   * 둘 중 하나만 어긋나도 화면이 거짓말을 한 채 굳는다. 되돌릴 길도 새로고침뿐이다.
   *
   * 문서를 새로 열면 그 조각이 하나가 된다: 새 쿠키로 서버가 그리고, SessionProvider 도 새로 묻는다.
   * 값은 로그인 한 번에 붙는 전체 로딩 한 번이고, 얻는 건 "로그인했는데 로그인 안 한 화면" 이
   * 구조적으로 불가능해지는 것이다. 로그인은 자주 하는 일이 아니다.
   *
   * `replace` 를 쓴다 — 뒤로가기로 로그인 폼에 돌아오지 않게(기존 동작 유지).
   */
  const navigating = Boolean(serverState?.ok);
  useEffect(() => {
    if (!serverState?.ok) return;
    window.location.replace(serverState.redirectTo);
  }, [serverState]);

  const validateAll = useCallback((): Record<string, string> => {
    const form = formRef.current;
    if (!form) return {};
    const parsed = schema.safeParse(toInput(new FormData(form)));
    return parsed.success ? {} : fieldErrorsOf(parsed.error);
  }, [schema, toInput]);

  /** 그 칸의 오류를 갱신하고, 오류가 있으면 문구를 돌려준다 */
  const validateField = useCallback(
    (name: string): string | undefined => {
      const all = validateAll();
      setClientErrors((prev) => {
        const next = { ...prev };
        if (all[name]) next[name] = all[name];
        else delete next[name];
        return next;
      });
      return all[name];
    },
    [validateAll],
  );

  /*
   * 칸을 떠날 때: 칸 안에서 가를 수 있는 것(zod)을 먼저 보고, 통과했을 때만 서버에 묻는다(remoteChecks).
   *
   * 답이 오기 전에 칸을 고쳤으면 그 답은 버린다 — 옛 값에 대한 오류가 새 값 위에 뜨면 안 된다.
   * 고치기 시작하면 onChange 의 재검증이 이 오류를 지운다(zod 는 통과하니까). 다시 떠나면 다시 묻는다.
   * 제출을 막지는 않는다: 서버가 제출 때 같은 답을 하므로, 여기 답은 "미리 알려 주기" 일 뿐이다.
   */
  const onBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.currentTarget;
      // 제출 중이라 칸이 disabled 로 바뀌며 난 blur 는 검증하지 않는다(2026-09-30, 사용자 신고: "비번 치고 엔터 치면
      // 빨간 경고가 뜨면서 로그인은 된다"). 크롬은 포커스된 칸이 비활성화되면 blur 를 쏘는데, 그 순간 검증이 읽는
      // FormData 는 **disabled 칸을 빼고** 만들어진다 — 방금 친 비밀번호를 빈 값으로 보고 "입력해요" 를 세웠다.
      // 버튼을 눌러 제출하면 포커스가 이미 버튼에 있어 이 blur 가 안 나서 엔터에서만 드러났다
      if (e.currentTarget.disabled) return;
      // 링크를 누르러 떠나는 blur 는 검증하지 않는다(2026-09-24, 사용자 신고: "로그인 버튼이 안 눌리고 가입하기를 눌러야 진행된다").
      // 가입 화면은 닉네임 칸이 자동 포커스라, "로그인" 을 누르는 mousedown 이 곧 이 blur 다. 여기서 오류 문구가 서면
      // 칸 아래가 한 줄 늘어 링크가 손가락 밑에서 빠지고, mouseup 이 다른 자리에 떨어져 click 이 성립하지 않았다.
      // 떠나는 사람에게 "닉네임을 입력해요" 를 알릴 이유도 없다. 가입하기를 먼저 누르면 오류가 이미 서 있어 안 밀렸던 것.
      if (e.relatedTarget instanceof HTMLAnchorElement) return;
      // 사파리는 링크를 눌러도 포커스를 옮기지 않아 relatedTarget 이 비어 온다 — 손대지 않은 빈 칸은 그래서 따로 건너뛴다.
      // 빈 칸의 "입력해요" 는 제출 때 onSubmit 이 한꺼번에 말한다
      if (value === "" && !(name in clientErrorsRef.current)) return;
      if (validateField(name)) return;
      const check = remoteChecks?.[name];
      if (!check) return;
      void check(value)
        .catch(() => null)
        .then((message) => {
          if (!message) return;
          const current = formRef.current?.elements.namedItem(name);
          if (!(current instanceof HTMLInputElement) || current.value !== value) return;
          setClientErrors((prev) => ({ ...prev, [name]: message }));
        });
    },
    [remoteChecks, validateField],
  );

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

  /*
   * 기본 제출을 **항상** 막고 액션을 직접 태운다(2026-09-23).
   *
   * React 19 는 `<form action={fn}>` 으로 제출하면 액션을 돌리기 직전에 네이티브 `form.reset()` 을 부른다
   * (react-dom 의 startHostTransition → requestFormReset, 커밋에서 `fiber.stateNode.reset()`).
   * 성공하면 어차피 화면을 떠나니 문제가 없지만, **실패하면 사용자가 친 값이 전부 사라진다** —
   * 가입은 칸이 다섯이라 "이미 가입된 이메일이에요" 한 줄에 닉네임, 이메일, 비밀번호 둘을 다시 쳐야 했다.
   *
   * 값을 되살리는 길(액션이 값을 돌려주고 defaultValue 로 다시 깔기)도 있지만, 그러면 비밀번호가
   * 서버 왕복에 실려야 하고 초기화와 복구 사이에 칸이 비는 순간이 생긴다. 초기화를 **아예 일으키지 않는**
   * 쪽이 짧다 — 폼에 action 을 걸지 않으면 React 의 그 경로가 열리지 않는다.
   *
   * 대신 JS 없이 제출되는 길은 포기한다. 이 폼은 이미 JS 가 있어야 산다(성공 이동이 window.location.replace 다).
   */
  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const errors = validateAll();
      if (Object.keys(errors).length > 0) {
        setClientErrors(errors);
        setErrorSerial((n) => n + 1);
        const first = Object.keys(errors)[0];
        form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        return;
      }
      // useActionState 의 액션을 손으로 부를 때는 transition 안이어야 한다(pending 이 그 위에서 산다)
      startTransition(() => submit(new FormData(form)));
    },
    [submit, validateAll],
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
