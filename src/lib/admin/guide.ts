// 서비스 변경 안내서(기획 운영팀에 주는 한 장짜리 HTML 문서)를 Vercel Blob 에 둘 자리. 올리기(scripts/guide-upload)와 읽기(services/admin-guide)가 같이 쓴다.
//
// 문서를 저장소에 두지 않고 Blob 에 두는 이유: 그림이 든 문서가 10MB 남짓이라 고칠 때마다 git 이력이 그만큼 불고,
// 문서는 코드보다 자주 바뀌어 배포 없이 갈아 끼워야 한다(2026-10-30 사용자 "실시간으로 코드 수정 중").
// 본문 HTML 은 관리자 확인 뒤 우리 경로(api/admin/guide)로만 내보내고, 그림은 추측할 수 없는 Blob 주소에 둔다 — 할 일 첨부와 같은 수준이다.
// 함수 응답 한도(4.5MB) 때문에 그림을 HTML 에 넣지 않고 파일로 가른다.
export const GUIDE_BLOB_PREFIX = "admin/guide/";
/** 본문 HTML. 가장 늦게 올린 하나를 보여 준다 */
export const GUIDE_HTML_PREFIX = `${GUIDE_BLOB_PREFIX}html/`;
/** 본문이 부르는 그림 */
export const GUIDE_IMAGE_PREFIX = `${GUIDE_BLOB_PREFIX}img/`;
