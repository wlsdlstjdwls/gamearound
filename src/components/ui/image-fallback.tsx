// 이미지 자리 대체 — 주소가 없거나 불러오다 실패했을 때 그 자리에 놓는 면.
//
// 왜 브랜드 심볼인가: 깨진 이미지 아이콘(엑박)은 "우리가 고장 났다"로 읽힌다. 스토어가 이미지를
// 내리거나 CDN 주소가 바뀌는 일은 우리 잘못이 아닌데도 그렇게 보인다. 빈 회색 면도 목록에서
// 구멍처럼 보여서, 자리를 브랜드로 채운다.
//
// 이모지를 쓰지 않는 것은 예전 CoverImage 주석의 규칙을 그대로 잇는다.
import { BrandSymbol } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

/**
 * 부모가 크기를 정한다(카드는 relative + aspect, 뉴스 썸네일은 고정 크기).
 * 심볼은 폭 비율로 줄었다 늘었다 한다 — 72×48 썸네일과 460×215 카드가 같은 컴포넌트를 쓰기 때문이다.
 * size 는 svg 속성값이고 실제 크기는 className 의 CSS 가 이긴다.
 */
export function ImageFallback({ label, className }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn("flex h-full w-full items-center justify-center bg-surface-3", className)}>
      <BrandSymbol size={32} className="h-auto w-[34%] min-w-[18px] max-w-[64px] text-dim-2" />
    </div>
  );
}
