"use client";
// 인디 홍보 글 쓰기, 고치기 폼 — Server Action 은 app/(user)/indie/actions.ts.
//
// 새 글은 그림을 이 폼에서 고른다(기획서 v2.0 S-23 "대표 이미지", 목업 indreg). 다만 그림은 Blob 경로에 글 id 를 박아야
// 올릴 수 있어서(lib/indie/schemas 주석) 글부터 저장하고, 받은 id 로 고른 그림을 이어 올린 뒤 등록현황(S-22)으로 간다.
// 올리다 실패하면 고치기 화면으로 보내 그 그림 칸에서 다시 올리게 한다. 고치기는 그림 칸(image-manager)이 따로 선다.
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createIndiePostAction, updateIndiePostAction, type IndieFormState } from "@/app/(user)/indie/actions";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { FormMessage } from "@/components/ui/form-message";
import { FormSelect } from "@/components/ui/select";
import { TEXTAREA_CLASS, TextField } from "@/components/ui/text-field";
import { GameLinkPicker } from "@/components/indie/game-link-picker";
import { IndieImagePicker } from "@/components/indie/image-picker";
import { uploadIndieImages } from "@/components/indie/upload-images";
import {
  INDIE_BODY_MAX,
  INDIE_DEVELOPER_MAX,
  INDIE_GENRES,
  INDIE_LINK_KINDS,
  INDIE_LINK_MAX,
  INDIE_PLATFORMS,
  INDIE_RELEASE_NOTE_MAX,
  INDIE_STAGES,
  INDIE_TAGLINE_MAX,
  INDIE_TITLE_MAX,
  INDIE_URL_MAX,
  storeLinkPlatform,
  type IndiePlatform,
} from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_GENRE_LABEL, INDIE_LINK_LABEL, INDIE_PLATFORM_LABEL, INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import type { IndieDetailDto } from "@/lib/indie/dto";

const LINK_OPTIONS = INDIE_LINK_KINDS.map((k) => ({ value: k, label: INDIE_LINK_LABEL[k] }));
const LABEL = "text-[12.5px] font-medium text-mut";
const HINT = "text-[12.5px] leading-[1.6] text-dim";

function SubmitButton({ label, sending }: { label: string; sending: string | null }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending || sending !== null} loadingLabel={sending ?? M.saving}>
      {label}
    </Button>
  );
}

export function IndiePostForm({ post }: { post?: IndieDetailDto }) {
  const router = useRouter();
  const action = post ? updateIndiePostAction.bind(null, post.id) : createIndiePostAction;
  const [state, formAction, submitting] = useActionState<IndieFormState, FormData>(action, null);
  const [stage, setStage] = useState<string>(post?.stage ?? INDIE_STAGES[0]);
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(post?.platforms ?? []));
  const [genres, setGenres] = useState<Set<string>>(new Set(post?.genres ?? []));
  // 저장된 링크를 둘로 가른다 — "store:<플랫폼>" 은 플랫폼별 칸으로, 나머지는 그 밖의 링크 칸으로(lib/indie/constants)
  const storeLinks = new Map<IndiePlatform, string>();
  const otherLinks = (post?.links ?? []).filter((l) => {
    const p = storeLinkPlatform(l.kind);
    if (p) storeLinks.set(p, l.url);
    return !p;
  });
  // 링크 칸은 적은 만큼 + 빈칸 하나. 다섯 칸을 늘 세우면 빈칸이 폼 길이를 두 배로 만든다
  const [linkRows, setLinkRows] = useState(Math.min(Math.max(otherLinks.length, 1), INDIE_LINK_MAX));

  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.ok || !state.redirectTo) return;
    const { redirectTo, postId, editPath } = state;
    if (!postId || files.length === 0) {
      router.push(redirectTo);
      return;
    }
    let live = true;
    void uploadIndieImages(postId, files, (done, total) => live && setSending(M.imagesSending(done + 1, total))).then((failed) => {
      if (!live) return;
      router.push(failed && editPath ? editPath : redirectTo);
    });
    return () => {
      live = false;
    };
    // 저장 결과가 올 때 한 번만 돈다 — 고른 그림(files)이 바뀌었다고 다시 올리지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  function toggleGenre(g: string) {
    setGenres((cur) => {
      const next = new Set(cur);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function togglePlatform(p: string) {
    setPlatforms((cur) => {
      const next = new Set(cur);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  return (
    // 고치기는 성공해도 값을 남긴다 — 저장한 값이 곧 화면에 있어야 할 값이다
    <ActionForm action={formAction} state={state} pending={submitting} resetOnSuccess={false} className="flex flex-col gap-5">
      {state && !state.ok && (
        <FormMessage tone="error" replayKey={state.error}>
          {state.error}
        </FormMessage>
      )}
      {state?.ok && !state.redirectTo && (
        <FormMessage tone="success" replayKey={state.message}>
          {state.message}
        </FormMessage>
      )}

      <TextField name="title" label={M.titleLabel} defaultValue={post?.title} maxLength={INDIE_TITLE_MAX} required />
      <TextField name="tagline" label={M.taglineLabel} hint={M.taglineHint} defaultValue={post?.tagline} maxLength={INDIE_TAGLINE_MAX} required />
      <TextField name="developerName" label={M.developerLabel} defaultValue={post?.developerName} maxLength={INDIE_DEVELOPER_MAX} required autoComplete="organization" />

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`mb-1.5 ${LABEL}`}>{M.stageLabel}</legend>
        <div className="flex flex-wrap gap-1.5">
          {INDIE_STAGES.map((s) => (
            <label key={s} className={chipClass({ active: stage === s, outline: true, className: "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}>
              <input type="radio" name="stage" value={s} checked={stage === s} onChange={() => setStage(s)} className="sr-only" />
              {INDIE_STAGE_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`mb-1.5 ${LABEL}`}>{M.platformsLabel}</legend>
        <div className="flex flex-wrap gap-1.5">
          {INDIE_PLATFORMS.map((p) => (
            <label key={p} className={chipClass({ active: platforms.has(p), outline: true, className: "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}>
              <input type="checkbox" name="platforms" value={p} checked={platforms.has(p)} onChange={() => togglePlatform(p)} className="sr-only" />
              {INDIE_PLATFORM_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* 고른 플랫폼마다 스토어 링크 칸이 생긴다(기획서 S-23, 목업 indreg). 고른 순서가 아니라 플랫폼 순서로 세운다 —
          칸이 누를 때마다 자리를 바꾸면 적던 칸을 놓친다. 끈 플랫폼의 칸은 사라지고 액션도 그 값을 안 읽는다 */}
      {platforms.size > 0 && (
        <fieldset className="flex flex-col gap-2.5 rounded-[var(--radius-md)] bg-surface-2 p-3.5">
          <legend className={`float-left mb-1 ${LABEL}`}>{M.storeLinksLabel}</legend>
          <p className={`clear-left ${HINT}`}>{M.storeLinksHint}</p>
          {INDIE_PLATFORMS.filter((p) => platforms.has(p)).map((p) => (
            <TextField
              key={p}
              name={`storeLink-${p}`}
              label={M.storeLinkLabel(INDIE_PLATFORM_LABEL[p])}
              defaultValue={storeLinks.get(p) ?? ""}
              maxLength={INDIE_URL_MAX}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://"
            />
          ))}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`mb-1.5 ${LABEL}`}>
          {M.genresLabel} <span className="text-dim">{M.genresHint}</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {INDIE_GENRES.map((g) => {
            const on = genres.has(g);
            return (
              <label key={g} className={chipClass({ active: on, outline: true, className: "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}>
                <input type="checkbox" name="genres" value={g} checked={on} onChange={() => toggleGenre(g)} className="sr-only" />
                {INDIE_GENRE_LABEL[g]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <TextField name="releaseNote" label={M.releaseNoteLabel} hint={M.releaseNoteHint} defaultValue={post?.releaseNote ?? ""} maxLength={INDIE_RELEASE_NOTE_MAX} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="indie-body" className={LABEL}>
          {M.bodyLabel}
        </label>
        <textarea
          id="indie-body"
          name="body"
          defaultValue={post?.body ?? ""}
          maxLength={INDIE_BODY_MAX}
          rows={10}
          required
          aria-describedby="indie-body-hint"
          className={TEXTAREA_CLASS}
        />
        <p id="indie-body-hint" className={HINT}>
          {M.bodyHint}
        </p>
      </div>

      {/* 목업 순서대로 소개 바로 아래 — 이름, 장르, 플랫폼, 소개, 대표 이미지 */}
      {!post && <IndieImagePicker files={files} onChange={setFiles} disabled={sending !== null} />}

      <TextField
        name="youtube"
        label={M.youtubeLabel}
        hint={M.youtubeHint}
        defaultValue={post?.youtubeId ? `https://youtu.be/${post.youtubeId}` : ""}
        inputMode="url"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="https://youtu.be/..."
      />

      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-1 ${LABEL}`}>{M.linksLabel}</legend>
        <p className={HINT}>{M.linksHint}</p>
        {Array.from({ length: linkRows }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormSelect
              name={`linkKind-${i}`}
              label={M.linkKindLabel(i + 1)}
              hideLabel
              options={LINK_OPTIONS}
              defaultValue={otherLinks[i]?.kind ?? INDIE_LINK_KINDS[0]}
              size="lg"
              className="sm:w-[150px]"
            />
            <TextField
              name={`linkUrl-${i}`}
              label={M.linkUrlLabel(i + 1)}
              hideLabel
              defaultValue={otherLinks[i]?.url ?? ""}
              maxLength={INDIE_URL_MAX}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://"
              wrapperClassName="flex-1"
            />
          </div>
        ))}
        {linkRows < INDIE_LINK_MAX && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setLinkRows((n) => n + 1)}>
              {M.linkAdd}
            </Button>
          </div>
        )}
      </fieldset>

      <GameLinkPicker initial={post?.game ?? null} />

      <div>
        <SubmitButton label={post ? M.submitEdit : M.submitNew} sending={sending} />
      </div>
    </ActionForm>
  );
}
