// 게임 상세 "이벤트, 소식" 카드의 화면 계약. DB 행 타입을 화면까지 흘리지 않는다(규약 §1).
export type GameEventKind = "event" | "demo" | "update" | "page";

export type GameEventDto = {
  kind: GameEventKind;
  /** 출처 이름표 열쇠(nintendo_kr, steam) */
  source: string;
  url: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
};
