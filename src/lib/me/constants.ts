// 내 활동(기획서 v2.0 S-24) 상수와 문구. 저장하는 프로필 사진은 3MB 이하(기획서 6.1 "프로필 사진 변경").
export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
/**
 * 고를 수 있는 원본 크기. 브라우저가 줄인 뒤(resizePhoto) 올리므로 저장 한도(AVATAR_MAX_BYTES)와 따로 둔다.
 * 3MB 로 원본을 막으면 휴대폰 사진(5~12MB)이 다 걸렸다(2026-10-28 사용자 지시 "용량 늘려 달라").
 */
export const AVATAR_PICK_MAX_BYTES = 20 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

/** 저장 경로 접두. 사람 ID 를 박아 남의 경로로 토큰을 받거나 남의 그림을 제 사진으로 적는 길을 막는다 */
export function avatarPrefix(userId: string): string {
  return `avatars/${userId}/`;
}

export const ME_MESSAGES = {
  title: "내 활동",
  // 목업(actPage)의 단추 이름 그대로 — 기획서 3.1 "프로필 사진 변경" 과도 같은 낱말이다
  avatarChange: "사진 변경",
  avatarReset: "기본 이미지로",
  avatarTooBig: "20MB 이하 이미지만 올릴 수 있어요",
  avatarFailed: "사진을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요",
  avatarChanged: "프로필 사진을 바꿨어요",
  avatarResetDone: "기본 이미지로 되돌렸어요",
  avatarHint: "20MB 이하 이미지(JPG, PNG, WEBP)",
  tabPosts: "내가 쓴 글",
  tabSaved: "저장한 글",
  postsEmpty: "아직 쓴 글이 없어요",
  postsEmptyLead: "게시판에 첫 글을 남겨 보세요.",
  savedEmpty: "아직 저장한 글이 없어요",
  savedEmptyLead: "마음에 드는 글에서 저장을 눌러 두면 여기에 모여요.",
} as const;
