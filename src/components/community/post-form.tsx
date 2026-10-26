"use client";
// 글쓰기(기획서 v2.0 S-14, 6.4). 전체 페이지 방식이고, 카테고리를 바꾸면 아래 칸만 바뀌고 제목, 본문은 그대로 남는다.
//   리뷰: 관련 게임, 스포 여부 필수 | 공략: 관련 게임 필수 | 홍보: 홍보 유형 필수, 관련 게임, 링크 선택 | 개발일지, 질문: 추가 칸 없음.
// 검증은 서버와 같은 zod 스키마(lib/community/schemas)로 먼저 보고, 오류는 칸 아래 빨간 글로 붙인다(aria-describedby).
// 칸 순서는 목업 wpage 를 따른다(2026-10-26): 카테고리 → 스포 여부(리뷰) → 홍보 유형, 링크(홍보) → 관련 게임 → 제목 → 본문.
//   글의 성격을 정하는 칸이 먼저 서야 아래 칸이 왜 생기고 사라지는지 읽힌다. 본문을 다 쓴 뒤 스포 여부를 묻으면 등록에서야 오류를 만난다.
//   꼭 채울 칸은 이름 옆에 "필수" 를 붙인다(components/ui/required-mark). 카테고리는 늘 하나가 골라져 있어 붙이지 않는다.
// 등록 뒤 그 카테고리 목록으로 간다. "취소" 는 들어온 화면으로 돌아간다(목업 wpage 의 취소 = 뒤로).
//
// 고른 카테고리를 주소(?category=)에도 싣는다 — 하위 메뉴 띠와 경로 줄이 주소로 소속을 읽어서(lib/nav 의 aliasQueries),
// 칩만 바꾸고 주소를 두면 "공략" 을 쓰는데 띠는 "리뷰" 를 켠다. 화면을 다시 받지 않게 history.replaceState 로 바꾼다
// (Next 가 useSearchParams 와 맞춰 준다, node_modules/next/dist/docs 의 linking-and-navigating). 뒤로가기 기록은 늘리지 않는다.
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPostAction } from "@/app/(public)/board/actions";
import { GamePicker, type PickedGame } from "@/components/community/game-picker";
import { Button } from "@/components/ui/button";
import { RequiredMark } from "@/components/ui/required-mark";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, CATEGORY_LIST_PATH, POST_BODY_MAX, POST_TITLE_MAX, PROMO_TYPES, PROMO_TYPE_LABEL, requiresGame, takesGame, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { postInputSchema } from "@/lib/community/schemas";
import { canGoBack } from "@/lib/nav-history";
import type { PostCategory } from "@/server/db/schema";

type Errors = Partial<Record<"category" | "title" | "body" | "spoiler" | "promoType" | "link" | "gameSlug" | "form", string>>;

/** 고르는 칸 한 줄(라디오를 칩 모양으로). 칸 이름과 오류를 fieldset 이 묶는다. hint 는 고르기 전에 읽을 안내 한 줄 */
function ChoiceRow({ name, legend, value, options, onChange, error, hint, required = false }: { name: string; legend: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; error?: string; hint?: string; required?: boolean }) {
  const errId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset aria-describedby={describedBy} className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-semibold text-ink">
        {legend}
        {required && <RequiredMark>{M.requiredMark}</RequiredMark>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={cn("press tap flex h-10 cursor-pointer items-center rounded-xl px-4 text-[14px] font-semibold shadow-hair transition-colors", value === o.value ? "bg-acc-soft text-acc" : "bg-surface-2 text-ink-2 hover:text-ink")}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="text-[12.5px] text-dim">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function PostForm({ categories, initial }: { categories: readonly PostCategory[]; initial: PostCategory }) {
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState<PostCategory>(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState("");
  const [promoType, setPromoType] = useState("");
  const [link, setLink] = useState("");
  const [game, setGame] = useState<PickedGame | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    const target = writePath(category);
    if (`${window.location.pathname}${window.location.search}` !== target) window.history.replaceState(null, "", target);
  }, [category]);

  const cancel = () => {
    if (canGoBack()) router.back();
    else router.push(CATEGORY_LIST_PATH[category]);
  };

  const submit = () => {
    // 관련 게임 칸이 없는 카테고리(라운지)로 바꿨으면 골라 둔 게임은 싣지 않는다 — 서버도 버리지만 검증 오류가 엉뚱한 칸에 서지 않게
    const input = { category, title, body, spoiler, promoType, link, gameSlug: takesGame(category) ? (game?.slug ?? "") : "" };
    const local = postInputSchema.safeParse(input);
    if (!local.success) {
      const next: Errors = {};
      for (const i of local.error.issues) next[String(i.path[0]) as keyof Errors] ??= i.message;
      return setErrors(next);
    }
    setErrors({});
    start(async () => {
      const r = await createPostAction(input);
      if (r?.ok) {
        toast(M.posted);
        router.push(r.redirectTo);
        return;
      }
      setErrors(r && !r.ok ? { ...(r.fieldErrors ?? {}), form: r.error } : { form: M.failed });
    });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-7"
    >
      <ChoiceRow name="category" legend={M.category} value={category} options={categories.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} onChange={(v) => setCategory(v as PostCategory)} error={errors.category} />
      {category === "review" && (
        <ChoiceRow
          name="spoiler"
          legend={M.spoilerLabel}
          value={spoiler}
          options={[
            { value: "no", label: M.spoilerOff },
            { value: "yes", label: M.spoilerOn },
          ]}
          onChange={setSpoiler}
          error={errors.spoiler}
          hint={M.spoilerHint}
          required
        />
      )}
      {category === "promo" && (
        <>
          <ChoiceRow name="promoType" legend={M.promoTypeLabel} value={promoType} options={PROMO_TYPES.map((t) => ({ value: t, label: PROMO_TYPE_LABEL[t] }))} onChange={setPromoType} error={errors.promoType} required />
          <TextField label={M.linkLabel} type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} error={errors.link} />
        </>
      )}
      {takesGame(category) && <GamePicker required={requiresGame(category)} value={game} onChange={setGame} error={errors.gameSlug} />}
      <TextField label={M.titleLabel} labelMark={<RequiredMark>{M.requiredMark}</RequiredMark>} value={title} maxLength={POST_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
      <div className="flex flex-col gap-2">
        <label htmlFor="post-body" className="text-[13px] font-semibold text-ink">
          {M.bodyLabel}
          <RequiredMark>{M.requiredMark}</RequiredMark>
        </label>
        <textarea
          id="post-body"
          value={body}
          maxLength={POST_BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={Boolean(errors.body) || undefined}
          aria-describedby={errors.body ? "post-body-error" : undefined}
          rows={14}
          className="min-h-[280px] resize-y rounded-xl border border-line-strong bg-bg px-4 py-3 text-[16px] leading-[1.7] text-ink outline-none focus:border-acc"
        />
        {errors.body && (
          <p id="post-body-error" role="alert" className="text-[12.5px] text-danger">
            {errors.body}
          </p>
        )}
      </div>
      {errors.form && (
        <p role="alert" className="text-[13px] text-danger">
          {errors.form}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={cancel} disabled={pending}>
          {M.cancel}
        </Button>
        <Button type="submit" size="lg" loading={pending} className="min-w-[140px]">
          {M.submit}
        </Button>
      </div>
    </form>
  );
}
