// 이미지가 도착할 때 회색 플레이스홀더 위로 페이드인시키는 next/image 래퍼.
// 따로 뺀 이유: onLoad 는 함수 prop 이라 클라이언트 컴포넌트가 필요한데, 이걸 쓰는 카드/상세 화면은
// 서버 컴포넌트로 남겨야 한다. 잎사귀 하나만 클라이언트로 내린다.
// 초기 상태를 "보임" 으로 두는 이유: 서버 HTML 과 JS 미실행 환경에서 이미지가 영영 투명해지면 안 된다.
// 이미 캐시돼 그려진 이미지는 숨기지 않는다 — 숨겼다 되살리는 게 바로 없애려는 그 깜빡임이다.
"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function FadeImage({ className, onLoad, onError, ...rest }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ref.current && !ref.current.complete) setPending(true);
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt 은 ImageProps 의 필수 prop 이라 rest 로 반드시 들어온다
    <Image
      ref={ref}
      className={cn("img-fade", className)}
      data-fade={pending ? "in" : undefined}
      onLoad={(e) => {
        setPending(false);
        onLoad?.(e);
      }}
      onError={(e) => {
        // 실패해도 투명한 채로 두지 않는다 — alt 문구는 보여야 한다
        setPending(false);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
