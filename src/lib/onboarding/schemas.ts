// 온보딩 입력 검증 — zod 단일 소스. 서버 액션과 클라이언트 폼이 같은 스키마를 본다(규약 §2).
import { z } from "zod";
import { GENRE_PICK_MAX } from "@/lib/onboarding/constants";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

export const ONBOARDING_MAX_PICKS = 32;

export const stepSchema = z.enum(ONBOARDING_STEPS);

/** 다중선택 폼에서 오는 값. FormData.getAll 은 문자열 배열이다 */
const pickList = z.array(z.string().trim().min(1)).max(ONBOARDING_MAX_PICKS);

export const platformsSchema = z.object({
  /** 빈 배열을 허용한다 — "안 고름"(건너뛰기)과 "전부 안 씀"은 UI 에서 갈리지 않으므로 같게 다룬다 */
  platforms: pickList,
});

export const genresSchema = z.object({
  /*
   * 숫자 배열인데 폼에서는 문자열로 온다. coerce 로 받되 정수가 아니면 떨군다.
   *
   * 상한을 **거절이 아니라 자르기**로 다루는 이유: 여기서 실패시키면 여섯 개를 고른 사람의 답이
   * 통째로 저장되지 않은 채 다음 단계로 넘어간다(액션의 saveAnswer 는 실패하면 그냥 돌아온다).
   * 화면은 이미 상한에서 카드를 잠그므로(PickGroup) 여기까지 넘치는 건 폼을 우회한 경우뿐이고,
   * 그때도 다섯 개는 남기는 편이 0개보다 낫다.
   */
  genreIds: z.array(z.coerce.number().int().positive()).transform((v) => v.slice(0, GENRE_PICK_MAX)),
});

export const dealStyleSchema = z.object({
  dealStyle: z.enum(["full_price", "wait_small", "wait_deep", "historic_low"]),
});

export const playTimeSchema = z.object({
  playTimeStyle: z.enum(["short", "medium", "long", "endless"]),
});

export const subscriptionsSchema = z.object({
  subscriptionKeys: pickList,
});

export const consentSchema = z.object({
  consent: z.literal(true, { message: "동의해야 다음으로 갈 수 있어요" }),
});

export type PlatformsInput = z.infer<typeof platformsSchema>;
export type GenresInput = z.infer<typeof genresSchema>;
