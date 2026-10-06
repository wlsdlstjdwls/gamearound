"use server";
// 인디 홍보 글 Server Action — 쓰기, 고치기, 지우기, 그림, 게임 찾기, 신고.
//
// 레이아웃이 로그인을 보지만 여기서 다시 본다 — 액션은 주소로 직접 불릴 수 있다.
// 신고 액션도 여기 있다: 공개 상세에서 부르지만 하는 일은 "로그인한 사람의 쓰기" 라 같은 자리에 둔다.
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { indieEditPath, indiePath, ROUTES } from "@/lib/routes";
import { INDIE_CREATE_RATE, INDIE_LINK_MAX } from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_REPORT_MESSAGES as R } from "@/lib/indie/messages";
import { indieImageRegisterSchema, indiePostSchema, indieReportSchema } from "@/lib/indie/schemas";
import { SHOP_GAME_SEARCH_MIN } from "@/lib/shops/game-schemas";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";
import { checkRateLimit } from "@/server/auth/rate-limit";
import {
  createIndiePost,
  deleteIndiePost,
  makeIndieCover,
  registerIndieImage,
  removeIndieImage,
  reportIndiePost,
  updateIndiePost,
  type IndieActor,
} from "@/server/services/indie";
import { searchShopGames } from "@/server/services/shop-games";
import { getCurrentUser, requireUser } from "@/server/services/users";

export type IndieFormState = { ok: true; message: string; redirectTo?: string } | { ok: false; error: string } | null;
export type IndieResult = { ok: true } | { ok: false; error: string };

async function actor(): Promise<IndieActor> {
  const user = await requireUser();
  return { userId: user.id, isAdmin: user.role === "admin" };
}

/** 공개 화면이 바뀌었다. 목록과 상세는 캐시가 없고, 홈만 ISR 이라 민다 */
function refresh(slug: string, postId?: string): void {
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.indie);
  revalidatePath(indiePath(slug));
  revalidatePath(ROUTES.indieMine);
  if (postId) revalidatePath(indieEditPath(postId));
}

function fail(e: unknown): { ok: false; error: string } {
  // 세션 만료 이동을 오류 문구로 삼키지 않는다(vendor 액션들과 같은 규칙)
  unstable_rethrow(e);
  return { ok: false, error: e instanceof Error && e.message ? e.message : M.badRequest };
}

/** 폼 값을 검증 전 꼴로 모은다. 링크는 칸마다 종류, 주소 짝이고 주소가 빈 칸은 버린다 */
function readForm(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  const links = Array.from({ length: INDIE_LINK_MAX }, (_, i) => ({
    kind: text(`linkKind-${i}`),
    url: text(`linkUrl-${i}`).trim(),
  })).filter((l) => l.url);
  return indiePostSchema.safeParse({
    title: text("title"),
    tagline: text("tagline"),
    developerName: text("developerName"),
    body: text("body"),
    stage: text("stage"),
    platforms: formData.getAll("platforms").map(String),
    releaseNote: text("releaseNote"),
    youtube: text("youtube"),
    links,
    gameId: text("gameId") || null,
  });
}

export async function createIndiePostAction(_prev: IndieFormState, formData: FormData): Promise<IndieFormState> {
  try {
    const user = await requireUser();
    const parsed = readForm(formData);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.badRequest };
    // 상한(글 수)은 지우고 다시 쓰면 우회되니 시간으로 한 번 더 막는다(INDIE_CREATE_RATE 주석)
    if (!(await checkRateLimit(`indie:create:${user.id}`, INDIE_CREATE_RATE))) return { ok: false, error: M.rateLimited };
    const post = await createIndiePost(user.id, parsed.data);
    refresh(post.slug);
    // 그림은 글 id 가 있어야 올릴 수 있다(경로에 박힌다) — 고치기 화면으로 넘겨 이어서 올리게 한다
    return { ok: true, message: M.created, redirectTo: `${indieEditPath(post.id)}?created=1` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateIndiePostAction(postId: string, _prev: IndieFormState, formData: FormData): Promise<IndieFormState> {
  try {
    const who = await actor();
    const parsed = readForm(formData);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.badRequest };
    const { slug } = await updateIndiePost(postId, who, parsed.data);
    refresh(slug, postId);
    return { ok: true, message: M.saved };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteIndiePostAction(postId: string): Promise<IndieResult> {
  try {
    const { slug } = await deleteIndiePost(postId, await actor());
    refresh(slug);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function registerIndieImageAction(input: {
  postId: string;
  url: string;
  pathname: string;
  width: number;
  height: number;
}): Promise<IndieResult> {
  try {
    const who = await actor();
    const parsed = indieImageRegisterSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.imageFailed };
    const { slug } = await registerIndieImage(parsed.data, who);
    refresh(slug, parsed.data.postId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeIndieImageAction(postId: string, imageId: string): Promise<IndieResult> {
  try {
    const { slug } = await removeIndieImage(imageId, await actor());
    refresh(slug, postId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function makeIndieCoverAction(postId: string, imageId: string): Promise<IndieResult> {
  try {
    const { slug } = await makeIndieCover(imageId, await actor());
    refresh(slug, postId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** 이을 게임 찾기. 매장 상품 폼과 같은 질의를 쓴다 — 두 화면이 다른 답을 주면 "저기선 나오는데" 가 생긴다 */
export async function searchIndieGamesAction(term: string): Promise<ShopGameOptionDto[]> {
  await requireUser();
  const q = term.trim();
  if (q.length < SHOP_GAME_SEARCH_MIN) return [];
  return searchShopGames(q);
}

export async function reportIndiePostAction(postId: string, reason: string): Promise<IndieResult> {
  try {
    // 비로그인 신고는 받지 않는다 — 한 사람 한 번(PK)이 문턱의 근거라 사람을 알아야 한다
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: R.signIn };
    const parsed = indieReportSchema.safeParse({ postId, reason });
    if (!parsed.success) return { ok: false, error: R.failed };
    const result = await reportIndiePost(parsed.data.postId, user.id, parsed.data.reason);
    if (!result.ok) return result;
    if (result.hidden) {
      revalidatePath(ROUTES.home);
      revalidatePath(ROUTES.indie);
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
