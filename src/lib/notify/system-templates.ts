// 코드가 사건마다 부르는 알림 템플릿(2026-10-30). 템플릿 본문은 알림템플릿관리에서 고치고, 코드와 변수는 여기서 정한다.
// 변수 목록을 화면에 보여 주려고 이름과 설명, 미리 보기 값을 같이 둔다. 본문에 없는 변수를 넣으면 {이름} 그대로 나가므로 이 목록이 곧 계약이다.
export const SYSTEM_TEMPLATES = {
  taskCreated: "task.created",
  taskAssigned: "task.assigned",
  taskMoved: "task.moved",
  taskNote: "task.note",
  qualityRun: "quality.run",
} as const;
export type SystemTemplateCode = (typeof SYSTEM_TEMPLATES)[keyof typeof SYSTEM_TEMPLATES];

type VarSpec = { name: string; hint: string; sample: string };

const TASK_BASE: VarSpec[] = [
  { name: "제목", hint: "업무요청 제목", sample: "스팀 가격 수집 지연 확인" },
  { name: "처리자", hint: "이 사건을 낸 관리자", sample: "운영자" },
  { name: "링크", hint: "카드 바로가기 주소", sample: "https://gamearound.kr/admin/tasks?task=sample" },
];

export const SYSTEM_TEMPLATE_VARS: Record<SystemTemplateCode, VarSpec[]> = {
  "task.created": [
    ...TASK_BASE,
    { name: "분류", hint: "업무 분류", sample: "버그" },
    { name: "우선순위", hint: "우선순위", sample: "높음" },
    { name: "담당자", hint: "담당자 이름", sample: "미지정" },
  ],
  "task.assigned": [...TASK_BASE, { name: "담당자", hint: "새 담당자 이름", sample: "운영자" }],
  "task.moved": [...TASK_BASE, { name: "상태", hint: "바뀐 상태(앞 상태에서 새 상태로)", sample: "할 일에서 하는 중으로" }],
  "task.note": [...TASK_BASE, { name: "기록", hint: "기록 본문 앞부분", sample: "로그 확인했어요. 내일 다시 볼게요." }],
  "quality.run": [
    { name: "자동수정", hint: "자동으로 고친 건수", sample: "3" },
    { name: "신규", hint: "새로 확인이 필요한 건수", sample: "2" },
    { name: "미확인", hint: "확인 대기 중인 전체 건수", sample: "14" },
    { name: "실패", hint: "고치다 실패한 건수", sample: "0" },
    { name: "사례", hint: "자동 수정 사유 몇 줄", sample: "출시일 자리표시 12-31 을 비웠어요" },
    { name: "링크", hint: "데이터오류관리 주소", sample: "https://gamearound.kr/admin/data-issues" },
  ],
};

export function isSystemTemplate(code: string): code is SystemTemplateCode {
  return code in SYSTEM_TEMPLATE_VARS;
}
