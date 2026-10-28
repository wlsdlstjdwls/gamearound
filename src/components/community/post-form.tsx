"use client";
// 글쓰기(기획서 v2.0 S-14, 6.4). 전체 페이지 방식이고, 카테고리를 바꾸면 위 칸만 바뀌고 제목, 본문은 그대로 남는다.
//   리뷰: 관련 게임, 스포 여부 필수 | 공략: 관련 게임 필수 | 홍보: 홍보 유형 필수, 관련 게임, 링크 선택 | 개발일지, 질문: 추가 칸 없음.
// 검증은 서버와 같은 zod 스키마(lib/community/schemas)로 먼저 보고, 오류는 칸 아래 빨간 글로 붙인다(aria-describedby).
//
// 모양(10-28 검수 "글 작성 폼이 넘 구리다"): 판 둘로 가른다 — 위 판은 글의 성격(카테고리, 스포, 홍보 유형, 관련 게임),
// 아래 판은 내용(제목, 본문 에디터, 첨부파일). 고르는 칸은 칩 줄이 아니라 한 덩어리 세그먼트다 — 칩이 흩어져 서면
// "여럿 고르기" 로 읽힌다. 등록, 취소는 화면 아래에 붙는 띠에 둔다 — 긴 글을 쓰다 맨 아래까지 내려가지 않게.
// 본문은 HTML 에디터(rich-editor)다. 첨부파일은 본문 끝에 묶음으로 붙여 보낸다(components/community/post-media).
//
// 고른 카테고리를 주소(?category=)에도 싣는다 — 하위 메뉴 띠와 경로 줄이 주소로 소속을 읽어서(lib/nav 의 aliasQueries),
// 칩만 바꾸고 주소를 두면 "공략" 을 쓰는데 띠는 "리뷰" 를 켠다. 화면을 다시 받지 않게 history.replaceState 로 바꾼다.
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPostAction } from "@/app/(public)/board/actions";
import { GamePicker, type PickedGame } from "@/components/community/game-picker";
import { PostAttachments } from "@/components/community/post-attachments";
import { attachmentsHtml, type UploadedFile } from "@/components/community/post-media";
import { Button } from "@/components/ui/button";
import { RequiredMark } from "@/components/ui/required-mark";
import { Bone } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { CATEGORY_LABEL, CATEGORY_LIST_PATH, POST_BODY_MAX, POST_TITLE_MAX, PROMO_TYPES, PROMO_TYPE_LABEL, requiresGame, takesGame, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { postInputSchema } from "@/lib/community/schemas";
import { canGoBack } from "@/lib/nav-history";
import type { PostCategory } from "@/server/db/schema";

// 에디터(tiptap)는 글쓰기에서만 쓰는 큰 덩어리라 따로 받는다. 서버 렌더는 하지 않는다(브라우저 선택 영역에 기대는 부품)
const RichEditor = dynamic(() => import("@/components/community/rich-editor").then((m) => m.RichEditor), {
  ssr: false,
  loading: () => <Bone className="h-[380px] w-full rounded-xl" />,
});

type Errors = Partial<Record<"category" | "title" | "body" | "spoiler" | "promoType" | "link" | "gameSlug" | "form", string>>;

/** 하나만 고르는 칸 — 라디오를 세그먼트 한 덩어리로. 칸 이름과 오류를 fieldset 이 묶는다. hint 는 고르기 전에 읽을 안내 한 줄 */
function Segmented({ name, legend, value, options, onChange, error, hint, required = false }: { name: string; legend: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; error?: string; hint?: string; required?: boolean }) {
  const errId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset aria-describedby={describedBy} className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1.5 text-[12.5px] font-medium text-mut">
        {legend}
        {required && <RequiredMark>{M.requiredMark}</RequiredMark>}
      </legend>
      <div className={cn("flex w-full gap-1 rounded-xl bg-surface-2 p-1 sm:w-fit", error && "shadow-[0_0_0_1px_var(--danger)]")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "press flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[9px] px-4 text-[14px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acc sm:flex-none",
              value === o.value ? "bg-surface text-ink shadow-[var(--elev-1)]" : "text-mut hover:text-ink",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="truncate">{o.label}</span>
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

/** 폼의 판 하나 — 머리 글자와 칸들 */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-[var(--radius-panel)] bg-surface p-5 shadow-hair sm:p-7">
      <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function PostForm({ categories, initial }: { categories: readonly PostCategory[]; initial: PostCategory }) {
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState<PostCategory>(initial);
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [textLength, setTextLength] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState({ editor: false, files: false });
  const [spoiler, setSpoiler] = useState("");
  const [promoType, setPromoType] = useState("");
  const [link, setLink] = useState("");
  const [game, setGame] = useState<PickedGame | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const uploading = busy.editor || busy.files;

  useEffect(() => {
    const target = writePath(category);
    if (`${window.location.pathname}${window.location.search}` !== target) window.history.replaceState(null, "", target);
  }, [category]);

  const cancel = () => {
    if (canGoBack()) router.back();
    else router.push(CATEGORY_LIST_PATH[category]);
  };

  const submit = () => {
    if (uploading) return toast(M.waitUpload);
    // 관련 게임 칸이 없는 카테고리(라운지)로 바꿨으면 골라 둔 게임은 싣지 않는다 — 서버도 버리지만 검증 오류가 엉뚱한 칸에 서지 않게
    const input = { category, title, body: html + attachmentsHtml(files), spoiler, promoType, link, gameSlug: takesGame(category) ? (game?.slug ?? "") : "" };
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
      className="flex flex-col gap-4"
    >
      <Panel title={M.sectionKind}>
        <div className={cn("grid gap-5", category === "review" && "sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-8")}>
          <Segmented name="category" legend={M.category} value={category} options={categories.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} onChange={(v) => setCategory(v as PostCategory)} error={errors.category} />
          {category === "review" && (
            <Segmented
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
        </div>
        {category === "promo" && (
          <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-8">
            <Segmented name="promoType" legend={M.promoTypeLabel} value={promoType} options={PROMO_TYPES.map((t) => ({ value: t, label: PROMO_TYPE_LABEL[t] }))} onChange={setPromoType} error={errors.promoType} required />
            <TextField label={M.linkLabel} type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} error={errors.link} />
          </div>
        )}
        {takesGame(category) && <GamePicker required={requiresGame(category)} value={game} onChange={setGame} error={errors.gameSlug} />}
      </Panel>

      <Panel title={M.sectionContent}>
        <TextField
          label={M.titleLabel}
          labelMark={<RequiredMark>{M.requiredMark}</RequiredMark>}
          placeholder={M.titlePlaceholder}
          value={title}
          maxLength={POST_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          aside={`${title.length}/${POST_TITLE_MAX}`}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="post-body" className="text-[12.5px] font-medium text-mut">
              {M.bodyLabel}
              <RequiredMark>{M.requiredMark}</RequiredMark>
            </label>
            <span className={cn("text-[11.5px] tabular-nums", textLength > POST_BODY_MAX ? "text-danger" : "text-dim")}>{M.bodyCount(textLength, POST_BODY_MAX)}</span>
          </div>
          <RichEditor
            id="post-body"
            invalid={Boolean(errors.body)}
            describedBy={errors.body ? "post-body-error" : undefined}
            onChange={(h, n) => {
              setHtml(h);
              setTextLength(n);
            }}
            onBusyChange={(b) => setBusy((cur) => ({ ...cur, editor: b }))}
            onError={toast}
          />
          {errors.body && (
            <p id="post-body-error" role="alert" className="text-[12.5px] text-danger">
              {errors.body}
            </p>
          )}
        </div>
        <PostAttachments files={files} onChange={setFiles} onBusyChange={(b) => setBusy((cur) => ({ ...cur, files: b }))} onError={toast} />
      </Panel>

      {errors.form && (
        <p role="alert" className="text-[13px] text-danger">
          {errors.form}
        </p>
      )}
      {/* 아래 띠 — 긴 글을 쓰는 동안 늘 손 닿는 자리. 아래 탭바가 서는 폭(650 이하, globals.css)에서는 그 위에 선다 */}
      <div className="sticky bottom-3 z-[3] max-[650px]:bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+12px)] flex items-center justify-end gap-2 rounded-[var(--radius-panel)] bg-surface/90 p-3 shadow-[var(--elev-2)] backdrop-blur-[var(--header-blur)]">
        {uploading && <span className="mr-auto pl-2 text-[12.5px] text-mut">{M.uploading}</span>}
        <Button type="button" variant="secondary" size="lg" onClick={cancel} disabled={pending}>
          {M.cancel}
        </Button>
        <Button type="submit" size="lg" loading={pending} disabled={uploading} className="min-w-[140px]">
          {M.submit}
        </Button>
      </div>
    </form>
  );
}
