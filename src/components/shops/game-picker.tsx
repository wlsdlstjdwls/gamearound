"use client";
// 물건 폼 안의 게임 고르기 칸 — 매장 설계서 §5.1, §7.
//
// 왜 폼 안에 검색을 넣나: 매장이 파는 물건은 거의 다 우리가 이미 아는 게임이다.
// 게임을 안 고르고 올린 상품은 그 게임 상세의 "파는 곳" 에 영원히 안 뜬다 —
// 매장이 물건을 올린 보람이 사라지는 자리가 여기다.
//
// 못 찾았을 때 직접 등록하는 길을 같은 칸에 붙인 이유(§7): 다른 화면으로 보내면 매장은
// 폼을 버리고 나갔다가 안 돌아온다. 대신 **직접 등록을 고른 뒤 제목을 고치면 다시 찾게 만든다** —
// 중복의 대부분은 검색을 안 해서가 아니라 검색한 제목과 등록한 제목이 달라서 생긴다.
import { useState, useTransition } from "react";
import { searchShopGamesAction } from "@/app/(user)/vendor/[shopSlug]/listings/actions";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";
import { SHOP_GAME_MESSAGES as M } from "@/lib/shops/game-messages";
import { needsResearch, SHOP_GAME_PUBLISHER_MAX, SHOP_GAME_SEARCH_MIN, SHOP_GAME_TITLE_MAX } from "@/lib/shops/game-schemas";

/** 고른 상태. 셋 중 하나다 — 아직 안 골랐다, 기존 게임을 골랐다, 직접 등록하기로 했다 */
type Picked = { kind: "none" } | { kind: "game"; game: ShopGameOptionDto } | { kind: "new" };

function optionLabel(g: ShopGameOptionDto): string {
  const name = g.titleKo ?? g.titleEn;
  const note = [g.titleKo && g.titleEn !== g.titleKo ? g.titleEn : null, g.publisher].filter(Boolean).join(" | ");
  return note ? `${name} (${note})` : name;
}

export function GamePicker() {
  const [term, setTerm] = useState("");
  /** 마지막으로 실제 검색을 돌린 말. 직접 등록 제목이 이것과 다르면 다시 찾게 한다(§7) */
  const [searchedTerm, setSearchedTerm] = useState("");
  const [results, setResults] = useState<ShopGameOptionDto[] | null>(null);
  const [picked, setPicked] = useState<Picked>({ kind: "none" });
  const [newTitle, setNewTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function runSearch() {
    const q = term.trim();
    if (q.length < SHOP_GAME_SEARCH_MIN) {
      setResults([]);
      setSearchedTerm("");
      return;
    }
    startTransition(async () => {
      const found = await searchShopGamesAction(q);
      setResults(found);
      setSearchedTerm(q);
      setPicked({ kind: "none" });
      setNewTitle(q);
    });
  }

  if (picked.kind === "game") {
    return (
      <div className="flex flex-col gap-2">
        <input type="hidden" name="gameId" value={picked.game.id} />
        <span className="text-[12.5px] font-medium text-mut">{M.selected}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] text-ink">{optionLabel(picked.game)}</span>
          <Button variant="ghost" size="sm" onClick={() => setPicked({ kind: "none" })}>
            {M.clear}
          </Button>
        </div>
        {picked.game.visibility === "shop_only" && <p className="text-[12.5px] text-dim">{M.shopOnlyNote}</p>}
      </div>
    );
  }

  // 화면과 서버가 같은 판단을 본다(needsResearch). 갈라지면 화면은 통과시키고 서버가 막는 폼이 된다
  const titleChanged = picked.kind === "new" && needsResearch(newTitle, searchedTerm);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <TextField
          label={M.searchLabel}
          hint={M.searchHint}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={SHOP_GAME_TITLE_MAX}
          wrapperClassName="flex-1"
        />
        <Button variant="secondary" onClick={runSearch} loading={pending} loadingLabel={M.searching}>
          {M.searchButton}
        </Button>
      </div>

      {results && results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => setPicked({ kind: "game", game: g })}
                className="press w-full rounded-[var(--radius-sm)] border border-line px-3 py-2.5 text-left text-[14px] text-ink transition-colors hover:border-dim"
              >
                {optionLabel(g)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results && results.length === 0 && <FormMessage tone="info">{M.searchEmpty}</FormMessage>}

      {results && picked.kind === "none" && (
        <Button variant="ghost" size="sm" onClick={() => setPicked({ kind: "new" })}>
          {M.noneOfThese}
        </Button>
      )}

      {picked.kind === "new" && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-line px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-ink">{M.createTitle}</span>
            <span className="text-[12.5px] text-dim">{M.createHint}</span>
          </div>
          <input type="hidden" name="searchedTerm" value={searchedTerm} />
          <TextField
            name="newGameTitle"
            label={M.titleLabel}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={SHOP_GAME_TITLE_MAX}
            error={titleChanged ? M.searchAgainRequired : null}
          />
          <TextField name="newGamePublisher" label={M.publisherLabel} hint={M.publisherHint} maxLength={SHOP_GAME_PUBLISHER_MAX} />
          <p className="text-[12.5px] text-dim">{M.shopOnlyNote}</p>
        </div>
      )}
    </div>
  );
}
