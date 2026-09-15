// 이미지가 도착할 때 회색 플레이스홀더 위로 페이드인시키는 next/image 래퍼.
// 따로 뺀 이유: onLoad 는 함수 prop 이라 클라이언트 컴포넌트가 필요한데, 이걸 쓰는 카드/상세 화면은
// 서버 컴포넌트로 남겨야 한다. 잎사귀 하나만 클라이언트로 내린다.
// 초기 상태를 "보임" 으로 두는 이유: 서버 HTML 과 JS 미실행 환경에서 이미지가 영영 투명해지면 안 된다.
// 이미 캐시돼 그려진 이미지는 숨기지 않는다 — 숨겼다 되살리는 게 바로 없애려는 그 깜빡임이다.
//
// 실패 처리도 여기가 맡는다. 화면에서 이미지가 깨지는 자리(목록 카드, 상세 헤더, 뉴스 썸네일)가
// 전부 이 래퍼를 지나가므로, 대체 화면을 세 곳에 따로 두지 않는다.
"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = ImageProps & {
  /** 불러오기에 실패했을 때 이미지 대신 놓을 것. 없으면 alt 만 남는다(예전 동작) */
  fallback?: React.ReactNode;
};

export function FadeImage({ className, onLoad, onError, fallback, priority, ...rest }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [pending, setPending] = useState(false);
  // 실패 여부를 boolean 이 아니라 "실패한 주소" 로 들고 있는다.
  // 목록이 다시 그려지며 같은 자리에 다른 주소가 들어올 때, 옛 실패가 새 이미지를 가리면 안 된다.
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const failed = failedSrc !== null && failedSrc === rest.src;

  useEffect(() => {
    if (ref.current && !ref.current.complete) setPending(true);
  }, []);

  if (failed && fallback) return <>{fallback}</>;

  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt 은 ImageProps 의 필수 prop 이라 rest 로 반드시 들어온다
    <Image
      ref={ref}
      priority={priority}
      // priority 이미지(상세 헤더)는 페이드하지 않는다 — 감싼 영역이 이미 페이드하는데 안쪽 이미지가
      // 한 박자 늦게 또 뜨면 같은 자리가 두 번 켜져 깜빡인다. LCP 를 opacity:0 으로 숨기는 비용도 없앤다.
      className={cn("img-fade", className)}
      data-fade={pending && !priority ? "in" : undefined}
      onLoad={(e) => {
        setPending(false);
        onLoad?.(e);
      }}
      onError={(e) => {
        // 실패해도 투명한 채로 두지 않는다 — 대체 화면이나 alt 문구는 보여야 한다
        setPending(false);
        setFailedSrc(rest.src);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
