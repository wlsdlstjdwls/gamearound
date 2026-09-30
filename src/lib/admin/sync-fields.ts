// 바뀐 칸 키 목록 → 시트에 띄울 묶음 이름 목록. 순수 함수라 화면과 테스트가 같이 쓴다.
import { SYNC_FIELD_GROUPS, SYNC_FIELD_OTHER } from "@/lib/admin/messages";

const GROUP_INDEX = new Map<string, number>(SYNC_FIELD_GROUPS.flatMap((g, i) => g.keys.map((k) => [k, i] as const)));

/** 겹치는 묶음은 한 번만, 표의 순서대로. 표에 없는 키는 모아서 맨 뒤 "기타" 하나로 */
export function syncFieldLabels(fields: readonly string[]): string[] {
  const hit = new Set<number>();
  let other = false;
  for (const f of fields) {
    const i = GROUP_INDEX.get(f);
    if (i === undefined) other = true;
    else hit.add(i);
  }
  const labels = [...hit].sort((a, b) => a - b).map((i) => SYNC_FIELD_GROUPS[i].label as string);
  if (other && !labels.includes(SYNC_FIELD_OTHER)) labels.push(SYNC_FIELD_OTHER);
  return labels;
}
