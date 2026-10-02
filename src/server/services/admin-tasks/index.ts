// 관리자 할 일 판 서비스의 입구. 읽기(board)와 쓰기(mutations)로 갈랐지만 호출부 경로는 그대로다.
// 칸 목록과 DTO 모양은 클라이언트도 쓰므로 잎 파일에 있다(lib/admin/tasks). 여기서 재수출한다.
export { TASK_STATUSES } from "@/lib/admin/tasks";
export type { AdminTask, ArchivedTask, Board, TaskAssignee, TaskAttachment, TaskNote, TaskPriority, TaskStatus } from "@/lib/admin/tasks";
export { ARCHIVE_VISIBLE_LIMIT, DONE_VISIBLE_LIMIT, getBoard, listArchived, listAssignees } from "./board";
export {
  addNote,
  archiveDone,
  createTask,
  deleteNote,
  deleteTask,
  markTaskSeen,
  moveTask,
  reorderTask,
  restoreTask,
  updateTask,
  type CreateTaskInput,
} from "./mutations";
export { countAttachments, registerAttachment, removeAttachment, taskExists } from "./attachments";
