"use client";
// 휴대폰 목록+상세의 "상세 열기" 끈(2026-10-30). MasterDetail 이 상세를 바닥 시트로 띄울 때 그 여는 함수를 여기에 걸고,
// 카드 목록(data-grid/cards)이 카드를 누르면 부른다. 넓은 화면과 MasterDetail 밖에서는 null 이라 카드는 줄만 고른다.
import { createContext } from "react";

export const MobileDetailContext = createContext<(() => void) | null>(null);
