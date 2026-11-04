// 메일 색. 메일은 CSS 변수를 못 읽어 globals.css 의 --ink, --mut, --dim, --acc, 면 색 값을 글자로 옮겼다.
// 감싸기(lib/notify/email, email-shell)와 코드가 그리는 덩어리(기사 카드 등, lib/news/digest-mail)가 같이 쓴다 — 한 통 안에서 색이 어긋나지 않게.
// 따로 둔 이유: email 과 email-shell 이 서로를 부르면 고리가 생긴다.
export const MAIL_COLOR = {
  ink: "#18202b",
  mut: "#55524c",
  dim: "#8a867e",
  acc: "#2563eb",
  /** 강조색 옅은 면(게임 딱지, 칸 머리 띠) */
  accSoft: "#eef3ff",
  soft: "#f1f0ec",
  line: "#e7e5df",
  /** 메일 바탕(사이트 --bg 와 같은 값, SITE.backgroundColor) */
  page: "#f4f6f9",
} as const;
