// 요청 기기가 휴대폰인가(2026-10-30, 관리자 화면 휴대폰 허용 표 lib/admin/mobile).
// 화면 폭이 아니라 UA 로 가른다 — 서버가 첫 그림부터 메뉴와 진입을 갈라야 열렸다 닫히는 깜빡임이 없다.
// 태블릿은 넓은 기기로 친다(PC 와 같은 화면을 쓸 만한 폭이다). UA 는 바꿀 수 있으니 권한 판정에는 쓰지 않는다.
import { headers } from "next/headers";
import { userAgent } from "next/server";

export async function isMobileDevice(): Promise<boolean> {
  const { device } = userAgent({ headers: await headers() });
  return device.type === "mobile";
}
