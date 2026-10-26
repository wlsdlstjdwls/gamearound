"use client";
// 글쓰기(기획서 v2.0 S-14, 6.4). 전체 페이지 방식이고, 카테고리를 바꾸면 아래 칸만 바뀌고 제목, 본문은 그대로 남는다.
//   리뷰: 스포 여부 필수 | 홍보: 홍보 유형 필수, 링크 선택 | 공략, 개발일지, 질문: 추가 칸 없음.
// 검증은 서버와 같은 zod 스키마(lib/community/schemas)로 먼저 보고, 오류는 칸 아래 빨간 글로 붙인다(aria-describedby).
// 등록 뒤 그 카테고리 목록으로 간다.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPostAction } from "@/app/(public)/board/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, POST_BODY_MAX, POST_TITLE_MAX, PROMO_TYPES, PROMO_TYPE_LABEL } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { postInputSchema } from "@/lib/community/schemas";
import type { PostCategory } from "@/server/db/schema";

type Errors = Partial<Record<"category" | "title" | "body" | "spoiler" | "promoType" | "link" | "form", string>>;

/** 고르는 칸 한 줄(라디오를 칩 모양으로). 칸 이름과 오류를 fieldset 이 묶는다 */
function ChoiceRow({ name, legend, value, options, onChange, error }: { name: string; legend: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; error?: string }) {
  const errId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errId : undefined} className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={cn("press tap flex h-10 cursor-pointer items-center rounded-xl px-4 text-[14px] font-semibold shadow-hair transition-colors", value === o.value ? "bg-acc-soft text-acc" : "bg-surface-2 text-ink-2 hover:text-ink")}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
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
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  const submit = () => {
    const input = { category, title, body, spoiler, promoType, link };
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
      <TextField label={M.titleLabel} value={title} maxLength={POST_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
      <div className="flex flex-col gap-2">
        <label htmlFor="post-body" className="text-[13px] font-semibold text-ink">
          {M.bodyLabel}
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
        />
      )}
      {category === "promo" && (
        <>
          <ChoiceRow name="promoType" legend={M.promoTypeLabel} value={promoType} options={PROMO_TYPES.map((t) => ({ value: t, label: PROMO_TYPE_LABEL[t] }))} onChange={setPromoType} error={errors.promoType} />
          <TextField label={M.linkLabel} type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} error={errors.link} />
        </>
      )}
      {errors.form && (
        <p role="alert" className="text-[13px] text-danger">
          {errors.form}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={pending} className="min-w-[140px]">
          {M.submit}
        </Button>
      </div>
    </form>
  );
}
