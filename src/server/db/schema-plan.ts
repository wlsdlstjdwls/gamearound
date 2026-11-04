// 업무 일정(WBS)(2026-11-04, 사용자 "큰 줄기 타임라인을 개발, 기획, 영업으로 동시에, 우리 프로그램에서 편집까지").
//
// 업무관리 화면의 두 번째 보기다. 칸반(admin_tasks)이 "오늘 무엇을 하나" 라면 이건 "언제까지 무엇을 하나" 다.
// 둘을 한 표에 섞지 않은 이유: 단위가 다르다. 일정 한 줄(제안서 만들기, 11-23 ~ 12-04)에 카드 여럿이 매달리고,
// 카드는 날짜 없이 순서로만 산다. 카드에 시작일, 종료일, 계층을 얹으면 칸반 팝업이 무거워진다.
// 대신 카드가 일정 한 줄을 가리키고(admin_tasks.plan_item_id), 진행률은 그 카드들이 끝 칸으로 간 비율로 계산한다.
//
// 계층은 parent_id 하나로 잇는다. 번호(1.2.3)는 저장하지 않는다 — 줄을 옮길 때마다 아래 번호를 전부 고쳐 써야 하고,
// 그 사이 하나라도 어긋나면 표가 거짓말을 한다. 읽을 때 순서(sort_order)로 매긴다(lib/admin/plan).
import { date, index, integer, pgEnum, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { users } from "./schema";

/**
 * 갈래. 개발, 기획, 영업이 나란히 가는 것이 이 화면의 목적이라 축으로 둔다.
 * 이름표는 공통코드(PLAN_TRACK)가 고친다. 늘릴 때는 ADD VALUE 한 줄과 코드북 기본값 한 줄이다
 */
export const adminPlanTrackEnum = pgEnum("admin_plan_track", ["dev", "plan", "sales"]);

/** 작업(기간이 있다)과 이정표(날 하나). 이정표는 start_on 만 쓰고 end_on 은 같은 날로 맞춘다 */
export const adminPlanKindEnum = pgEnum("admin_plan_kind", ["task", "milestone"]);

export const adminPlanItems = pgTable("admin_plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  /*
   * 상위 줄. 상위를 지우면 아래도 같이 지운다(cascade) — 상위 없이 남은 하위는 번호가 1.x 에서 갑자기 맨 앞으로 튀어
   * 무엇의 일부였는지 잃는다. 화면은 지우기 전에 하위 줄 수를 말하고 묻는다.
   */
  parentId: uuid("parent_id").references((): AnyPgColumn => adminPlanItems.id, { onDelete: "cascade" }),
  /** 같은 상위 안의 순서. 저장할 때 화면 순서대로 다시 매긴다 */
  sortOrder: integer("sort_order").notNull().default(0),
  title: text("title").notNull(),
  track: adminPlanTrackEnum("track").notNull().default("dev"),
  kind: adminPlanKindEnum("kind").notNull().default("task"),
  /*
   * 기간. 하위가 있는 줄은 하위의 처음과 끝으로 그리므로 이 값을 쓰지 않는다(비워 둬도 된다).
   * 날짜만 쓴다(date) — 일정은 "몇 시" 가 아니라 "며칠" 단위다. timestamptz 로 두면 KST 와 UTC 사이에서 하루씩 밀린다
   */
  startOn: date("start_on", { mode: "string" }),
  endOn: date("end_on", { mode: "string" }),
  /*
   * 손으로 적은 진행률(0~100). 비면 계산한다: 이은 카드가 있으면 끝난 비율, 하위가 있으면 하위의 기간 가중 평균.
   * 손 값이 이긴다 — 카드로 쪼개지 않는 일(서류 접수 등)도 진행을 적을 수 있어야 한다
   */
  progress: integer("progress"),
  /** 담당. 계정이 지워지면 비운다(set null) — 일정은 남아야 한다 */
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  /** 산출물. "제안서", "기능 동결 목록" 처럼 끝났다고 말할 근거 */
  output: text("output"),
  memo: text("memo"),
  ...auditColumns(),
}, (t) => [
  // 읽기는 늘 "전부를 순서대로" 하나다. 줄이 수백을 넘을 일이 없어 이것으로 충분하다
  index("admin_plan_items_order_idx").on(t.parentId, t.sortOrder),
]);

/**
 * 일정 줄 첨부(2026-11-04, 사용자 "여기에 이미지나 파일도 넣고 다운받게, 용량 조심"). 업무요청 첨부(admin_task_attachments)와
 * 같은 길이다 — 파일은 Vercel Blob, 이 표는 주소만 쥔다. 표를 업무요청 첨부와 합치지 않은 이유: 그 표의 task_id 는 NOT NULL 이고
 * 지우는 서비스가 할 일 기준으로 파일을 모은다. 일정 줄을 지우면 행은 cascade 로 지워지지만 **파일은 못 지운다** —
 * 일정 저장(services/admin-plan savePlan)이 지우기 전에 주소를 모아 두었다가 지운다.
 */
export const adminPlanAttachments = pgTable("admin_plan_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  planItemId: uuid("plan_item_id")
    .notNull()
    .references(() => adminPlanItems.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  /** 저장소 안 경로. 등록할 때 이 일정 줄 접두 아래인지 본다 */
  pathname: text("pathname").notNull(),
  /** 올린 사람이 붙인 파일 이름. 저장 경로는 확장자만 쓴다 */
  name: text("name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  ...auditColumns(),
}, (t) => [index("admin_plan_attachments_item_idx").on(t.planItemId, t.createdAt)]);
