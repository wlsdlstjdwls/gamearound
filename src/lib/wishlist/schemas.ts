// 카드 하트가 보내는 slug 검증 — 스토어 게임 하트(wishlist/actions)와 인디 게임 하트(indie/actions)가 같이 쓴다.
import { z } from "zod";

/** 주소 조각이라 길이만 막는다. 200 은 가장 긴 slug(긴 영문 제목 + 접미사)를 넉넉히 넘는 문턱이다 */
export const cardSlugSchema = z.string().min(1).max(200);
