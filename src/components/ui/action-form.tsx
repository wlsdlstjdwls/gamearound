"use client";
// 서버 액션 폼 — 실패하면 적은 값을 그대로 두고, 성공했을 때만 비운다.
//
// 왜 <form action={fn}> 을 쓰지 않나: React 19 는 그렇게 제출하면 액션을 돌리기 직전에 네이티브
// form.reset() 을 부른다(react-dom 의 requestFormReset). 성공하면 티가 안 나지만 실패하면 친 값이
// 전부 사라진다 — 2026-09-23 가입 화면에서 먼저 드러났고(use-auth-form), 관리자 폼, 매장 폼,
// 알림 폼이 같은 판이었다. 할 일 메모와 추가 폼은 주석으로 "실패하면 남긴다" 고 해 놓고 실제로는 지우고 있었다.
//
// 그래서 action 을 걸지 않고 onSubmit 에서 액션을 손으로 부른다. 값을 되살리는 게 아니라 초기화가
// 아예 일어나지 않게 하는 쪽이라 깜빡임이 없다. 성공 뒤 비우기는 예전 동작을 그대로 옮긴 것이다(resetOnSuccess).
//
// 대가: useFormStatus 가 더는 pending 을 못 본다(form action 으로 제출될 때만 산다).
// 그래서 pending 을 받아 문맥으로 내려 준다 — 제출 버튼은 useActionFormPending() 을 쓴다.
import { createContext, startTransition, useContext, useEffect, useRef, type ComponentProps, type FormEvent } from "react";

type ActionResult = { ok: boolean } | null | undefined;

const PendingContext = createContext(false);

/** ActionForm 안의 제출 버튼이 쓰는 pending. useFormStatus 대신이다 */
export function useActionFormPending(): boolean {
  return useContext(PendingContext);
}

type Props = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  /** useActionState 가 돌려준 dispatch */
  action: (formData: FormData) => void;
  /** useActionState 의 state — ok 가 서는 순간 폼을 비운다 */
  state: ActionResult;
  /** useActionState 의 세 번째 값 */
  pending: boolean;
  /** 성공 뒤 폼을 기본값으로 되돌릴지. 끄면 성공해도 값이 남는다 */
  resetOnSuccess?: boolean;
};

export function ActionForm({ action, state, pending, resetOnSuccess = true, children, ...rest }: Props) {
  const ref = useRef<HTMLFormElement>(null);

  // state 는 제출마다 새 객체라 같은 성공이 두 번 와도 두 번 비운다
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // submitter 를 넘겨야 누른 버튼의 name/value 가 실린다(승인, 반려처럼 버튼이 값을 가진 폼)
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    // dispatch 를 손으로 부를 때는 transition 안이어야 한다 — pending 이 그 위에서 산다
    startTransition(() => action(formData));
  }

  return (
    <PendingContext.Provider value={pending}>
      <form ref={ref} onSubmit={onSubmit} {...rest}>
        {children}
      </form>
    </PendingContext.Provider>
  );
}
