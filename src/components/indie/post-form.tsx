"use client";
// 인디 홍보 글 쓰기, 고치기 폼 — Server Action 은 app/(user)/indie/actions.ts.
//
// 그림 칸이 이 폼에 없는 이유: 그림은 Blob 경로에 글 id 를 박아야 올릴 수 있다(lib/indie/schemas 주석).
// 새 글은 아직 id 가 없으니 글부터 저장하고, 고치기 화면으로 넘어가 그림을 올린다.
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
import {
  INDIE_BODY_MAX,
  INDIE_DEVELOPER_MAX,
  INDIE_LINK_KINDS,
  INDIE_LINK_MAX,
  INDIE_PLATFORMS,
  INDIE_RELEASE_NOTE_MAX,
  INDIE_STAGES,
  INDIE_TAGLINE_MAX,
  INDIE_TITLE_MAX,
  INDIE_URL_MAX,
} from "@/lib/indie/constants";
import { INDIE_FORM_MESSAGES as M, INDIE_LINK_LABEL, INDIE_PLATFORM_LABEL, INDIE_STAGE_LABEL } from "@/lib/indie/messages";
import type { IndieDetailDto } from "@/lib/indie/dto";

const LINK_OPTIONS = INDIE_LINK_KINDS.map((k) => ({ value: k, label: INDIE_LINK_LABEL[k] }));
const LABEL = "text-[12.5px] font-medium text-mut";
const HINT = "text-[12.5px] leading-[1.6] text-dim";

function SubmitButton({ label }: { label: string }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending} loadingLabel={M.saving}>
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
  // 링크 칸은 적은 만큼 + 빈칸 하나. 다섯 칸을 늘 세우면 빈칸이 폼 길이를 두 배로 만든다
  const [linkRows, setLinkRows] = useState(Math.min(Math.max(post?.links.length ?? 0, 1), INDIE_LINK_MAX));

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

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
            <label key={s} className={chipClass({ active: stage === s, className: "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}>
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
            <label key={p} className={chipClass({ active: platforms.has(p), className: "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}>
              <input type="checkbox" name="platforms" value={p} checked={platforms.has(p)} onChange={() => togglePlatform(p)} className="sr-only" />
              {INDIE_PLATFORM_LABEL[p]}
            </label>
          ))}
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
              defaultValue={post?.links[i]?.kind ?? INDIE_LINK_KINDS[0]}
              size="lg"
              className="sm:w-[150px]"
            />
            <TextField
              name={`linkUrl-${i}`}
              label={M.linkUrlLabel(i + 1)}
              hideLabel
              defaultValue={post?.links[i]?.url ?? ""}
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
        <SubmitButton label={post ? M.submitEdit : M.submitNew} />
      </div>
    </ActionForm>
  );
}
