// 장애, 오류 판 — 화면 하나가 제 일을 못 할 때 그 자리에 서는 한 덩어리(2026-10-13).
//
// 왜 공용인가: DB 장애 안내(components/db-unavailable), 화면 오류(error-notice)가 따로 생기면서 하나는 회색 면에
// 글 두 줄, 하나는 큰 제목에 검정 단추로 모양이 갈렸다. 같은 사고가 화면마다 다른 얼굴로 보이면 "이 사이트가 고장" 이
// 아니라 "이 화면이 고장" 으로 읽혀 다른 화면을 눌러 볼 이유가 사라진다. 그림, 글, 단추 자리를 여기 한 곳에 둔다.
//
// 그림은 로고 손전등이다. 빛이 깜빡인다 — "꺼졌다" 가 아니라 "다시 켜지는 중" 을 말한다(globals.css 의 .beam-flicker).
// 이 파일에 "use client" 를 붙이지 않는다 — 서버 화면(목록, 상세)과 클라이언트 오류 경계가 같이 쓴다.
import { BrandSymbol } from "@/components/ui/logo";
import { EmptyScene } from "@/components/ui/empty-scene";
import { raisedClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";

/**
 * 화면 전체가 이 판뿐일 때의 폭. 본문 폭(1140px)을 다 쓰면 그림과 두 줄이 넓은 흰 판 한가운데 떠 빈 판으로 보인다
 * (2026-10-13 1280 캡처). 결과 자리(section)는 옆에 필터 기둥이 있어 자리 폭을 그대로 쓴다.
 */
const PAGE_WIDTH_CLASS = "mx-auto w-full max-w-[560px]";

/** 그림 원판 안 손전등 폭. 원판(size-24, 96px)의 2/3 — 빛 끝이 원 테두리에 닿지 않게 */
const SYMBOL_SIZE = 64;

export type StatusPanelSize = "section" | "page";

/**
 * 그림의 몸짓. flicker: 빛이 깜빡인다 — 장애, 오류("꺼졌다 다시 켜지는 중"). search: 빛이 훑는다 — 없는 주소(404)처럼
 * 고장이 아니라 "비춰 봤는데 없다" 인 자리(ui/empty-scene). 404 에 깜빡이는 손전등을 세우면 사이트가 고장 난 것으로 읽힌다
 */
export type StatusPanelGraphic = "flicker" | "search";

export function StatusPanel({
  title,
  body,
  actions,
  footnote,
  size = "section",
  role = "status",
  graphic = "flicker",
  code,
}: {
  title: string;
  body: string;
  /** 단추 자리. 첫 단추가 주 행동이다(다시 시도) */
  actions?: React.ReactNode;
  /** 맨 아래 작은 글(오류 번호, 개발 안내) */
  footnote?: React.ReactNode;
  /** section: 결과 자리 안(필터, 제목은 그대로 둔다). page: 화면 전체가 이것뿐일 때 — 위아래로 숨을 둔다 */
  size?: StatusPanelSize;
  role?: "status" | "alert";
  graphic?: StatusPanelGraphic;
  /** 그림 아래 큰 숫자(404). 주소를 잘못 친 사람이 "어떤 종류의 실패인가" 를 한눈에 알게 한다 */
  code?: string;
}) {
  return (
    <section
      role={role}
      className={cn(
        raisedClass("enter-item flex flex-col items-center px-6 text-center"),
        size === "page" ? cn(PAGE_WIDTH_CLASS, "my-6 gap-3 py-12 sm:my-10 sm:py-16") : "gap-2.5 py-10 sm:py-12",
      )}
    >
      {graphic === "search" ? (
        <EmptyScene className="mb-2" />
      ) : (
        <span aria-hidden className="beam-flicker mb-2 flex size-24 items-center justify-center rounded-full bg-surface-2">
          <BrandSymbol size={SYMBOL_SIZE} />
        </span>
      )}
      {code && <p aria-hidden className="text-[44px] font-black leading-none tracking-[-0.06em] text-acc-3 sm:text-[56px]">{code}</p>}
      <h2 className={cn("font-extrabold tracking-[-0.02em] text-ink", size === "page" ? "text-[20px]" : "text-[17px]")}>{title}</h2>
      <p className="max-w-[360px] text-[13.5px] leading-[1.7] text-mut">{body}</p>
      {actions && <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div>}
      {footnote && <div className="mt-3 text-[11.5px] leading-[1.6] text-dim-2">{footnote}</div>}
    </section>
  );
}
