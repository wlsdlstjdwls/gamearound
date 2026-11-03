"use client";
// 회사 정보 고치기 폼 — 한글 이름, 소개, 사이트, 나라, 설립 연도, 로고. 액션은 app/(user)/companies/[slug]/actions.ts.
// 로고는 고르는 순간 미리보기로 바뀌고 Blob 으로 올린 주소를 숨은 칸에 담는다. 실제 저장은 "저장" 이 한 번에 한다 —
// 로고만 따로 저장하면 사진을 바꾸고 다른 칸을 버린 채 나간 경우와 구분이 안 된다.
import { upload } from "@vercel/blob/client";
import { useActionState, useRef, useState, useTransition } from "react";
import { saveCompanyAction } from "@/app/(user)/companies/[slug]/actions";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { sectionCardClass } from "@/components/ui/page";
import { FormSelect } from "@/components/ui/select/fields";
import { TEXTAREA_CLASS, TextField } from "@/components/ui/text-field";
import { COMPANY_MANAGE_MESSAGES as G } from "@/lib/companies/messages";
import { CLAIM_URL_MAX, COMPANY_DESCRIPTION_MAX, COMPANY_NAME_KO_MAX, companyLogoPrefix } from "@/lib/companies/schemas";
import { AVATAR_PICK_MAX_BYTES } from "@/lib/me/constants";
import { ROUTES } from "@/lib/routes";
import { resizePhoto } from "@/lib/shops/photo-resize";
import type { CompanyEditable } from "@/server/services/company-claims";

function SaveButton({ disabled }: { disabled: boolean }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" size="lg" loading={pending} loadingLabel="저장하는 중" disabled={disabled} className="w-full sm:w-auto sm:min-w-[140px]">
      {G.save}
    </Button>
  );
}

export function CompanyManageForm({ company, countries }: { company: CompanyEditable; countries: Array<{ value: string; label: string }> }) {
  const [state, formAction, submitting] = useActionState(saveCompanyAction, null);
  const [logo, setLogo] = useState(company.logoUrl);
  const [preview, setPreview] = useState(company.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, start] = useTransition();
  const [descLength, setDescLength] = useState(company.description?.length ?? 0);
  const input = useRef<HTMLInputElement>(null);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    if (file.size > AVATAR_PICK_MAX_BYTES) {
      setLogoError(G.logoTooBig);
      return;
    }
    const before = { logo, preview };
    setPreview(URL.createObjectURL(file));
    start(async () => {
      try {
        const photo = await resizePhoto(file);
        const blob = await upload(`${companyLogoPrefix(company.id)}${Date.now()}.${photo.ext}`, photo.blob, {
          access: "public",
          handleUploadUrl: ROUTES.apiCompanyLogoUpload,
          contentType: photo.blob.type,
        });
        setLogo(blob.url);
        setPreview(blob.url);
      } catch {
        setLogo(before.logo);
        setPreview(before.preview);
        setLogoError(G.logoFailed);
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  return (
    <ActionForm noValidate action={formAction} state={state} pending={submitting} className={sectionCardClass("flex flex-col gap-4")}>
      {state && !state.ok && (
        <FormMessage tone="error" replayKey={state.error}>
          {state.error}
        </FormMessage>
      )}
      {state?.ok && (
        <FormMessage tone="success" replayKey={state.message}>
          {state.message}
        </FormMessage>
      )}
      <input type="hidden" name="slug" value={company.slug} />
      <input type="hidden" name="logoUrl" value={logo ?? ""} />

      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-line bg-white">
          {preview ? (
            // 미리보기는 고른 파일(blob: 주소)일 때도 있어 이미지 최적화를 거칠 수 없다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-contain p-1.5" />
          ) : (
            <span className="text-[11px] text-dim">{G.logoLabel}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="press tap inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] bg-surface-2 px-3.5 text-[13.5px] font-semibold text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acc">
            {G.logoPick}
            <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => onPick(e.currentTarget.files?.[0])} />
          </label>
          {logo && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLogo(null);
                setPreview(null);
              }}
            >
              {G.logoRemove}
            </Button>
          )}
        </div>
      </div>
      {logoError && <FormMessage tone="error">{logoError}</FormMessage>}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField compact name="nameKo" label={G.nameKoLabel} defaultValue={company.nameKo ?? ""} maxLength={COMPANY_NAME_KO_MAX} />
        <TextField
          compact
          type="url"
          name="websiteUrl"
          label={G.websiteLabel}
          placeholder="https://"
          defaultValue={company.websiteUrl ?? ""}
          maxLength={CLAIM_URL_MAX}
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-mut">{G.countryLabel}</p>
          <FormSelect
            name="countryCode"
            label={G.countryLabel}
            hideLabel
            size="md"
            defaultValue={company.countryCode ?? ""}
            options={[{ value: "", label: G.countryNone }, ...countries]}
          />
        </div>
        <TextField compact name="foundedYear" label={G.foundedYearLabel} defaultValue={company.foundedYear ? String(company.foundedYear) : ""} inputMode="numeric" maxLength={4} placeholder="2015" />
      </div>
      <div className="relative">
        <label htmlFor="company-description" className="mb-1.5 block text-[12.5px] font-medium text-mut">
          {G.descriptionLabel}
        </label>
        <textarea
          id="company-description"
          name="description"
          rows={5}
          maxLength={COMPANY_DESCRIPTION_MAX}
          defaultValue={company.description ?? ""}
          onChange={(e) => setDescLength(e.currentTarget.value.length)}
          className={TEXTAREA_CLASS}
        />
        <span aria-hidden className="pointer-events-none absolute right-3 bottom-2.5 text-[12px] text-dim tabular-nums">
          {descLength}/{COMPANY_DESCRIPTION_MAX}
        </span>
      </div>
      <div className="flex justify-end">
        <SaveButton disabled={uploading} />
      </div>
    </ActionForm>
  );
}
