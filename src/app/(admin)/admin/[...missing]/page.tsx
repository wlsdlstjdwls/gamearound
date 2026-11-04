// 없는 관리 주소(/admin/없는-화면). 맞는 라우트가 없는 주소는 Next 가 루트 not-found(회원 404)로 보내고, 관리자 레이아웃도 걷힌다.
// 여기서 받아 notFound() 를 던지면 가장 가까운 admin/not-found 가 관리자 판 안에 선다. 있는 화면은 정적 세그먼트라 늘 이것보다 먼저 맞는다.
// 역할 검사는 레이아웃이 한다 — 관리자 아닌 사람에게 "관리자 화면이 없다" 를 보여 주지 않는다.
import { notFound } from "next/navigation";

export default function AdminMissing(): never {
  notFound();
}
