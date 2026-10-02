// 할 일 판의 낱말과 모양. **서버 전용이 아니다** — 판 UI(클라이언트)와 서비스(서버)가 같이 쓴다.
//
// 왜 서비스에서 갈랐나: 칸 목록(TASK_STATUSES)은 타입이 아니라 값이라 import 가 지워지지 않는다.
// 서비스에 두면 클라이언트 묶음이 그 파일을 통째로 끌고 오고, 거기 붙은 server-only 와 next/headers 가
// 빌드를 세운다. 값은 여기, 질의는 서비스에 둔다.
import type { SourceName } from "@/server/db/schema";

/** 판의 칸 순서. 화면이 이 순서 그대로 왼쪽부터 세운다 */
export const TASK_STATUSES = ["backlog", "todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * 판에 세우는 칸(2026-10-02). 작업대기(backlog)는 화면에서 뺐다 — 사용자: "작업대기 칸은 필요 없지 않나, 영역이 넓어지잖아".
 * 할 일 칸이 이미 "아직 안 시작한 일" 을 다 받고 있었고, 뺄 때 작업대기 카드는 0건이었다.
 * **enum 에서는 지우지 않는다**(숨긴다 ≠ 지운다) — 되살리려면 여기에 다시 넣으면 된다.
 * 서버 검증(statusSchema)은 넷 다 받는다. 판에 없는 칸으로 옮길 길은 화면에 없다.
 */
export const BOARD_STATUSES = ["todo", "doing", "done"] as const satisfies readonly TaskStatus[];

export const TASK_PRIORITIES = ["high", "normal", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * 할 일 갈래(2026-10-01). 순서가 곧 셀렉트와 필터 칩의 순서다. 첫 값이 기본값이다(DB default 와 같다).
 * "긴급" 은 없다 — 급함 축(TASK_PRIORITIES)이 이미 그 뜻을 쥐고 있다.
 */
export const TASK_CATEGORIES = ["task", "bug", "idea", "data", "etc"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

/**
 * 멈춤 판정(2026-10-01). 처리 중인데 이만큼 아무도 안 고친 카드에 표시를 단다 — 판을 보는 이유의 절반이
 * "뭐가 막혔나" 다. 7일인 이유: 판을 쓰는 사람이 둘이고 주 단위로 일한다. 한 주를 넘긴 "하는 중" 은 사실상 멈춘 일이다.
 * 할 일, 작업대기 칸은 안 본다 — 거기 오래 있는 건 순서가 뒤라서지 막혀서가 아니다.
 */
export const TASK_STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 멈춘 날수. 멈춤이 아니면 null */
export function staleDays(task: { status: TaskStatus; updatedAt: Date }, now: number): number | null {
  if (task.status !== "doing") return null;
  const days = Math.floor((now - task.updatedAt.getTime()) / DAY_MS);
  return days >= TASK_STALE_DAYS ? days : null;
}

/** 기록 갈래. `note` 는 사람이 적은 글, `move` 는 판이 남긴 칸 이동 자취 */
export const TASK_NOTE_KINDS = ["note", "move"] as const;
export type TaskNoteKind = (typeof TASK_NOTE_KINDS)[number];

/** 첨부 파일 하나(2026-10-02). 이미지면 화면이 작은 그림으로, 아니면 이름과 크기로 보인다 */
export interface TaskAttachment {
  id: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
}

/** 할 일에 달린 기록 한 줄. 카드를 펼치면 시각순으로 보인다 */
export interface TaskNote {
  id: string;
  kind: TaskNoteKind;
  /** 사람이 적은 글. 칸 이동 자취는 비어 있다 */
  body: string | null;
  /** 칸 이동 자취의 앞뒤 칸. 화면이 여기에 이름을 붙인다 */
  from: TaskStatus | null;
  to: TaskStatus | null;
  /** 적은 사람. id 는 "새 기록" 셈에서 내 글을 빼는 데 쓴다 */
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
  /** 이 기록에 붙은 파일. 글 없이 파일만 남긴 기록도 있다 */
  attachments: TaskAttachment[];
}

/** 담당자 한 사람. 이름은 표시 이름, 없으면 이메일이다 */
export interface TaskAssignee {
  id: string;
  name: string;
}

export interface AdminTask {
  id: string;
  title: string;
  body: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  sortOrder: number;
  dueAt: Date | null;
  doneAt: Date | null;
  /** 붙인 대상. 화면은 이 값으로 바로 가는 링크를 만든다 */
  game: { id: string; slug: string; title: string } | null;
  shop: { id: string; name: string } | null;
  source: SourceName | null;
  /** 이 일을 쥔 사람. 비어 있으면 아무도 안 쥔 일이다 */
  assignee: TaskAssignee | null;
  /** 올린 사람. 담당자와 따로 둔다 — 적은 사람과 할 사람은 다르다. 계정이 지워졌으면 비어 있다 */
  author: TaskAssignee | null;
  updatedAt: Date;
  /**
   * 이 할 일에 쌓인 기록. 판 질의가 한 번에 다 읽어 온다 —
   * 카드를 펼칠 때마다 물으면 카드 수만큼 왕복이 늘고, Neon 왕복 하나가 220ms 다.
   */
  notes: TaskNote[];
  /** 카드 본문에 붙은 파일(기록에 붙은 것은 그 기록에 있다) */
  attachments: TaskAttachment[];
}

export type Board = Record<TaskStatus, AdminTask[]>;

/** 판에서 걷은 할 일(지난 일 화면). 카드 모양은 판과 같고 걷은 시각만 더 있다 */
export interface ArchivedTask extends AdminTask {
  archivedAt: Date;
}

/**
 * "새 기록" 을 세기 시작한 때(2026-10-02, 이 기능이 생긴 날 KST 자정). 한 번도 안 연 카드는 이때 뒤의 기록만 센다 —
 * 기준이 없으면 기능을 켜는 순간 지난 기록 전부가 "새 기록" 으로 판을 덮는다.
 */
export const NEW_NOTE_EPOCH = Date.parse("2026-10-02T00:00:00+09:00");

/**
 * 카드의 "새 기록" 수 — 남이 적은 글 중 내가 그 카드를 마지막으로 연 뒤에 달린 것.
 * 칸 이동 자취는 안 센다(판을 보면 이미 보인다). 내 글도 안 센다(내가 적은 걸 새로 볼 일은 없다).
 */
export function unreadNoteCount(notes: Pick<TaskNote, "kind" | "authorId" | "createdAt">[], meId: string, seenAt: number | undefined): number {
  const since = seenAt ?? NEW_NOTE_EPOCH;
  return notes.filter((n) => n.kind === "note" && n.authorId !== meId && n.createdAt.getTime() > since).length;
}
