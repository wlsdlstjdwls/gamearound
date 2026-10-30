"use client";
// 코드북을 클라이언트 부품에 건네는 자리(2026-10-30). 루트 레이아웃이 서버 캐시(services/common-codes 의 getCodeBook)에서 한 번 읽어 내려 준다 —
// 클라이언트 부품마다 따로 묻지 않는다. 공통코드를 저장하면 서버가 캐시 태그와 레이아웃을 밀어 다음 화면부터 새 이름표가 온다.
// 공급자 밖(테스트, 따로 그리는 조각)에서는 코드 기본값으로 선다.
import { createContext, useContext, useMemo } from "react";
import { buildCodeBook, codeMap, codeName, codeOptions, type CodeBook } from "@/lib/codes/book";

const DEFAULT_BOOK = buildCodeBook([]);
const CodeBookContext = createContext<CodeBook>(DEFAULT_BOOK);

export function CodeBookProvider({ book, children }: { book: CodeBook; children: React.ReactNode }) {
  return <CodeBookContext.Provider value={book}>{children}</CodeBookContext.Provider>;
}

/** 이름표(name), 고르기 보기(options, 사용 코드만), 이름표 객체(map) */
export function useCodes() {
  const book = useContext(CodeBookContext);
  return useMemo(
    () => ({
      name: (group: string, code: string) => codeName(book, group, code),
      options: (group: string) => codeOptions(book, group),
      map: (group: string) => codeMap(book, group),
    }),
    [book],
  );
}
