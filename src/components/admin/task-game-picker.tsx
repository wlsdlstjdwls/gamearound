"use client";

// 할 일에 붙일 게임 고르기(2026-09-22).
//
// 앞서는 uuid 를 적는 칸이었다("지금은 검수 화면에서 ID 를 복사해 온다"). 그 길은 다른 화면을 열고
// 행을 찾고 복사해 돌아와야 해서, 붙이는 값이 적는 값보다 비쌌다 — 그러면 아무도 안 붙이고,
// "할 일이 카탈로그 행에 매여 있다" 는 이 판의 존재 이유가 쓰이지 않는다.
//
// 매장 상품 폼의 GamePicker 를 그대로 쓰지 않는 이유: 저쪽은 "못 찾으면 직접 등록" 까지가 한 몸이다
// (매장은 우리가 모르는 물건을 판다). 할 일은 그렇지 않다 — 못 찾으면 안 붙이면 그만이고,
// 여기서 게임을 새로 만들 수 있게 두면 판에서 카탈로그가 늘어난다.
// 질의는 같은 것을 쓴다(searchShopGames) — 두 화면이 다른 답을 주면 "저기선 나오는데" 가 생긴다.
import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { gamePath } from "@/lib/routes";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";
import { FIELD, FIELD_LABEL } from "@/components/admin/task-fields";
import { searchTaskGamesAction } from "@/app/(admin)/admin/tasks/actions";

/**
 * 후보 한 줄의 덧말. 같은 제목이 여럿일 때 영문과 배급사로 가른다.
 * 제목과 한 줄에 괄호로 붙이던 것을 아랫줄로 내렸다(2026-10-01, 사용자: "목록이 구분이 잘 안 된다") —
 * 괄호 속 영문이 제목만큼 진해서 어디까지가 한 후보인지가 안 읽혔다.
 */
function optionNote(g: ShopGameOptionDto): string {
  return [g.titleKo && g.titleEn !== g.titleKo ? g.titleEn : null, g.publisher].filter(Boolean).join(" | ");
}

/**
 * 고른 게임 한 줄.
 *
 * `slug` 는 **이미 저장된 게임에만** 있다. 방금 고른 것은 아직 이 할 일에 붙은 값이 아니라
 * 상세로 가는 길을 열어 줄 자리가 아니다 — 가고 나면 고른 것이 저장되지 않은 채 사라진다.
 */
type Picked = { id: string; title: string; slug?: string };

export function TaskGamePicker({ initial }: { initial?: Picked | null }) {
  /** 고른 게임. null 이면 안 붙인 상태다 — 폼은 빈 문자열을 보내고 서버가 "뗐다" 로 읽는다 */
  const [picked, setPicked] = useState<Picked | null>(initial ?? null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ShopGameOptionDto[] | null>(null);
  const [pending, start] = useTransition();

  const runSearch = () => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    start(async () => setResults(await searchTaskGamesAction(q)));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 이 칸은 늘 있어야 한다 — 없으면 폼이 gameId 를 아예 안 보내고, 서버는 그것을
          "건드리지 말라" 로 읽어 뗀 게임이 그대로 남는다 */}
      <input type="hidden" name="gameId" value={picked?.id ?? ""} />
      <span className={FIELD_LABEL}>{TASK_MESSAGES.gamePickLabel}</span>

      {picked ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-acc-soft px-3 py-2.5 shadow-[0_0_0_1px_var(--acc)]">
          <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-acc">{picked.title}</span>
          {picked.slug && (
            <Link
              href={gamePath(picked.slug)}
              className="press rounded-[7px] px-2 py-1 text-[12px] text-mut transition-colors hover:text-acc"
            >
              {TASK_MESSAGES.gamePickOpen}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="press tap inline-flex items-center rounded-[7px] px-2 py-1 text-[12px] text-mut transition-colors hover:text-danger"
          >
            {TASK_MESSAGES.gamePickClear}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                // 이 칸의 엔터는 찾기다. 막지 않으면 폼이 통째로 제출되어 할 일이 먼저 만들어진다
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                runSearch();
              }}
              placeholder={TASK_MESSAGES.gamePickPlaceholder}
              autoComplete="off"
              className={cn(FIELD, "flex-1")}
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={pending}
              className="press shrink-0 rounded-xl bg-surface px-4 text-[13.5px] text-mut shadow-[0_0_0_1px_var(--line)] transition-colors hover:text-ink disabled:opacity-60"
            >
              {pending ? TASK_MESSAGES.gamePickSearching : TASK_MESSAGES.gamePickSearch}
            </button>
          </div>

          {results && results.length > 0 && (
            // 후보가 길어도 폼이 밀리지 않게 자리를 정해 두고 그 안에서 굴린다
            // 후보는 한 상자 안에 헤어라인으로 갈라 세운다 — 칸마다 테두리를 두르면 테두리 무늬가 먼저 읽혔다
            <ul className="max-h-[216px] divide-y divide-line overflow-y-auto overscroll-contain rounded-xl shadow-[0_0_0_1px_var(--line-strong)]">
              {results.map((g) => {
                const note = optionNote(g);
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setPicked({ id: g.id, title: g.titleKo ?? g.titleEn })}
                      className="press flex w-full flex-col gap-0.5 bg-surface px-3 py-2 text-left transition-colors hover:bg-acc-soft"
                    >
                      <span className="text-[13.5px] font-semibold text-ink">{g.titleKo ?? g.titleEn}</span>
                      {note && <span className="truncate text-[11.5px] text-dim">{note}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {results && results.length === 0 && <p className="text-[12px] text-dim">{TASK_MESSAGES.gamePickEmpty}</p>}
          {!results && <p className="text-[11.5px] text-dim">{TASK_MESSAGES.gamePickHint}</p>}
        </>
      )}
    </div>
  );
}
