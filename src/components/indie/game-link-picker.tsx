"use client";
// 홍보 글에 이을 카탈로그 게임 고르기.
//
// 매장 GamePicker 를 그대로 쓰지 않는 이유: 저쪽은 "못 찾으면 직접 등록" 까지가 한 몸이다(매장은 우리가 모르는
// 물건을 판다). 홍보 글은 못 찾으면 안 이으면 그만이다 — 여기서 게임을 만들 수 있게 두면 아무나 카탈로그를 늘린다.
// 질의는 같은 것을 쓴다(searchShopGames).
import { useState, useTransition } from "react";
import { searchIndieGamesAction } from "@/app/(user)/indie/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import type { IndieGameLinkDto } from "@/lib/indie/dto";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";

type Picked = { id: string; title: string; verified: boolean } | null;

function optionTitle(g: ShopGameOptionDto): string {
  return g.titleKo ?? g.titleEn;
}

function optionNote(g: ShopGameOptionDto): string {
  return [g.titleKo && g.titleEn !== g.titleKo ? g.titleEn : null, g.publisher].filter(Boolean).join(" | ");
}

export function GameLinkPicker({ initial }: { initial: IndieGameLinkDto | null }) {
  const [picked, setPicked] = useState<Picked>(initial ? { id: initial.id, title: initial.title, verified: initial.verified } : null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ShopGameOptionDto[] | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch() {
    startTransition(async () => setResults(await searchIndieGamesAction(term)));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[12.5px] font-medium text-mut">{M.gameLabel}</legend>
      <p className="text-[12.5px] leading-[1.6] text-dim">{M.gameHint}</p>
      <input type="hidden" name="gameId" value={picked?.id ?? ""} />

      {picked ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-mut">{M.gamePicked}</span>
          <span className="text-[14px] font-semibold text-ink">{picked.title}</span>
          <span className={picked.verified ? "text-[12px] text-ok" : "text-[12px] text-dim"}>{picked.verified ? M.gameVerified : M.gamePending}</span>
          <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
            {M.gameClear}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <TextField
              label={M.gameSearchLabel}
              hideLabel
              placeholder={M.gameSearchLabel}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              // 엔터가 바깥 폼을 제출하지 않게 — 이 칸의 엔터는 "찾기" 다
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
              wrapperClassName="flex-1"
            />
            <Button variant="secondary" onClick={runSearch} loading={pending} loadingLabel={M.gameSearch}>
              {M.gameSearch}
            </Button>
          </div>
          {results && results.length === 0 && <p className="text-[12.5px] text-dim">{M.gameNone}</p>}
          {results && results.length > 0 && (
            <ul className="flex max-h-[260px] flex-col gap-1 overflow-y-auto">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked({ id: g.id, title: optionTitle(g), verified: false });
                      setResults(null);
                    }}
                    className="press flex min-h-11 w-full flex-col items-start justify-center rounded-lg px-3 py-1.5 text-left transition-colors duration-fast hover:bg-surface-2"
                  >
                    <span className="text-[14px] text-ink">{optionTitle(g)}</span>
                    {optionNote(g) && <span className="text-[12px] text-dim">{optionNote(g)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </fieldset>
  );
}
