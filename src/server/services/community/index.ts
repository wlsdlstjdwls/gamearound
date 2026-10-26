// 게시판 서비스 입구. 호출부는 "@/server/services/community" 하나만 본다(AGENTS.md 4장, 폴더 + index).
export type { BoardHomeDto, CommentDto, PostDetailDto, PostPage, PostRowDto } from "./dto";
export { createPost, getPostDetail, listMyPosts, listPosts, type ListPostsParams } from "./posts";
export { addComment, listComments, listMySavedPosts, toggleLike, toggleSave } from "./reactions";
export { getBoardHome } from "./home";
