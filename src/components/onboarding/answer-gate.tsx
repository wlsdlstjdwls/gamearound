"use client";
// 답했는지를 껍데기 전체에 알리는 통로.
//
// 왜 컨텍스트인가: 카드 격자는 본문에 있고 "다음" 버튼은 바닥 띠에 있다 — 형제라 props 로는 못 잇는다.
// 참고자료 29장의 규칙("답하기 전 하단 버튼은 비활성")을 지키려면 둘 사이에 선이 하나 필요하다.
//
// CSS 로 흉내 내지 않은 이유: form:not(:has(:checked)) 로 버튼을 흐리게는 할 수 있지만
// disabled 속성이 안 붙어 엔터키 제출이 그대로 통과하고 낭독기도 "누를 수 있음" 이라 읽는다.
import { createContext, useContext, useState, type ReactNode } from "react";

type Gate = {
  /** 이 단계가 답을 꼭 받아야 하는가 */
  required: boolean;
  answered: boolean;
  setAnswered: (v: boolean) => void;
};

const AnswerGateContext = createContext<Gate>({ required: false, answered: true, setAnswered: () => {} });

export function useAnswerGate(): Gate {
  return useContext(AnswerGateContext);
}

export function AnswerGate({
  required = false,
  /** 되돌아온 사람은 이미 답이 채워져 있다 — 그때 버튼이 꺼져 있으면 갇힌다 */
  initialAnswered = false,
  children,
}: {
  required?: boolean;
  initialAnswered?: boolean;
  children: ReactNode;
}) {
  const [answered, setAnswered] = useState(initialAnswered);
  return <AnswerGateContext.Provider value={{ required, answered, setAnswered }}>{children}</AnswerGateContext.Provider>;
}
