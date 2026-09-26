"use client";
// CSV 로 한 번에 올리기 — Server Action 은 app/(user)/vendor/[shopSlug]/listings/actions.ts 의 importCsvAction.
//
// 파일을 그대로 보내지 않고 **여기서 글자로 풀어** 보낸다. 엑셀이 "CSV(쉼표로 분리)" 로 저장한 한글 파일은
// EUC-KR 이고, "CSV UTF-8" 로 저장하면 UTF-8 이다. 매장주는 둘 중 무엇으로 저장했는지 모른다 —
// UTF-8 로 엄격하게 읽어 보고 깨지면 EUC-KR 로 읽는다. 브라우저의 TextDecoder 가 둘 다 안다.
//
// ActionForm 을 쓰지 않는 이유: 제출 전에 파일을 읽는 비동기 한 단계가 끼어야 한다. 대신 같은 규칙을 지킨다 —
// <form action> 으로 보내지 않아 React 의 form.reset() 이 돌지 않는다(ui/action-form 주석).
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { importCsvAction, type CsvImportState } from "@/app/(user)/vendor/[shopSlug]/listings/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { toCsv } from "@/lib/csv";
import { LISTING_CSV_MAX_BYTES } from "@/lib/shops/constants";
import { LISTING_CSV_HEADER } from "@/lib/shops/listing-csv";
import { CSV_MESSAGES as M } from "@/lib/shops/listing-messages";

/** 양식에 넣는 본보기 두 줄. 바코드가 있는 줄과 없는 줄을 하나씩 둔다 — 둘 다 된다는 것을 보여 준다 */
const TEMPLATE_EXAMPLES = [
  ["젤다의 전설 티어스 오브 더 킹덤", "8809633080139", "닌텐도 스위치", "중고", "45000", "2", "판매 중"],
  ["슈퍼 마리오 월드 (박스 없음)", "", "슈퍼패미컴", "중고", "30000", "1", "작성 중"],
];

const TEMPLATE_FILE = "판매목록_양식.csv";

async function readCsvText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("euc-kr").decode(buf);
  }
}

function downloadTemplate() {
  const blob = new Blob([toCsv([LISTING_CSV_HEADER, ...TEMPLATE_EXAMPLES])], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = TEMPLATE_FILE;
  a.click();
  URL.revokeObjectURL(url);
}

export function ListingCsvForm({ shopSlug }: { shopSlug: string }) {
  const [state, dispatch, pending] = useActionState<CsvImportState, FormData>(importCsvAction.bind(null, shopSlug), null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const file = new FormData(e.currentTarget).get("file");
    if (!(file instanceof File) || file.size === 0) return setLocalError(M.fileRequired);
    if (file.size > LISTING_CSV_MAX_BYTES) return setLocalError(M.fileTooBig);

    const fd = new FormData();
    fd.set("csv", await readCsvText(file));
    startTransition(() => dispatch(fd));
  }

  const error = localError ?? (state && !state.ok ? state.error : null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 text-[12.5px] text-mut">
        <p>{M.lead}</p>
        <p className="text-dim">{M.columns}</p>
      </div>
      <div>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          {M.template}
        </Button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error && (
          <FormMessage tone="error" replayKey={error}>
            {error}
          </FormMessage>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="csv-file" className="text-[12.5px] font-medium text-mut">
            {M.fileLabel}
          </label>
          <input
            id="csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="text-[14px] text-ink file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-line-strong file:bg-bg file:px-3 file:py-2 file:text-[13px] file:text-ink"
          />
        </div>
        <div>
          <Button type="submit" loading={pending} loadingLabel={M.submitting}>
            {M.submit}
          </Button>
        </div>
      </form>

      {state?.ok && (
        <FormMessage tone={state.errors.length > 0 ? "info" : "success"} replayKey={state.message}>
          <p>{state.message}</p>
          {state.errors.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-[12.5px]">
              {state.errors.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </FormMessage>
      )}
    </div>
  );
}
