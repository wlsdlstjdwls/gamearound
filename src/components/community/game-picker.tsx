"use client";
// 글쓰기의 "관련 게임" 칸(목업 S-14 wpage 의 wgn). 리뷰, 공략은 필수, 홍보는 선택이다(lib/community/constants).
//
// 받기는 헤더 검색창과 같은 자동완성(components/search-suggest 의 useSuggestResult, /api/search/suggest)을 쓰고,
// 목록 모양과 키보드는 공용 제안 목록(components/ui/suggest)에 맡긴다. 새 질의를 만들지 않은 이유: 검색에서 찾히는 게임과
// 여기서 고를 수 있는 게임이 같아야 한다 — 다르면 "검색엔 있는데 글쓰기엔 없다" 가 된다.
//
// 고른 값은 이름이 아니라 slug 다. 이름은 같은 게임이 여럿일 수 있고(리마스터, 지역판), 서버는 slug 로 게임을 다시 찾는다.
// 목업은 목록에 없는 이름을 손으로 적게 두지만 우리는 받지 않는다 — 글에서 게임 상세로 가는 링크가 서야 해서 카탈로그의 게임만 고른다.
// 고른 뒤 글자를 고치면 고른 게임이 풀린다(이름과 실제 고른 게임이 어긋난 채 등록되지 않게).
import { useMemo, useState } from "react";
import { useSuggestResult } from "@/components/search-suggest";
import { XIcon } from "@/components/ui/icons";
import { RequiredMark } from "@/components/ui/required-mark";
import { useSuggest } from "@/components/ui/suggest";
import { TextField } from "@/components/ui/text-field";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";

export type PickedGame = { slug: string; title: string };

const FIELD_ID = "post-game";

export function GamePicker({ required, value, onChange, error }: { required: boolean; value: PickedGame | null; onChange: (g: PickedGame | null) => void; error?: string }) {
  const [text, setText] = useState(value?.title ?? "");
  const result = useSuggestResult(text);
  const items = useMemo(() => (result?.games ?? []).map((g) => ({ key: g.slug, name: g.title })), [result]);

  const onValue = (next: string) => {
    setText(next);
    // 목록에서 고르면(또는 목록의 이름과 똑같이 치면) 그 게임이 잡힌다. 이름이 같은 게임이 여럿이면 목록 위쪽(더 잘 맞는 쪽)이다
    const hit = items.find((i) => i.name === next);
    if (hit) onChange({ slug: hit.key, title: hit.name });
    else if (value) onChange(null);
  };
  const { inputProps, popup } = useSuggest({ id: FIELD_ID, value: text, onValue, items });

  return (
    <TextField
      {...inputProps}
      label={required ? M.gameLabel : M.gameLabelOptional}
      labelMark={required ? <RequiredMark>{M.requiredMark}</RequiredMark> : undefined}
      placeholder={M.gamePlaceholder}
      hint={M.gameHint}
      error={error}
      popup={popup}
      trailing={
        text !== "" ? (
          <button
            type="button"
            aria-label={M.gameClear}
            onClick={() => {
              setText("");
              onChange(null);
            }}
            className="press tap flex size-9 items-center justify-center rounded-lg text-dim hover:bg-surface-2 hover:text-ink"
          >
            <XIcon size={15} />
          </button>
        ) : undefined
      }
    />
  );
}
