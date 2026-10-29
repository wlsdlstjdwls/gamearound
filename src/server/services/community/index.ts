// 게시판 서비스 입구. 호출부는 "@/server/services/community" 하나만 본다(AGENTS.md 4장, 폴더 + index).
export type { AdminCommentRowDto, AdminPostRowDto, BoardHomeDto, CommentDto, MyPostCommentDto, PostDetailDto, PostGameDto, PostPage, PostRowDto } from "./dto";
export { createPost, getPostCategory, getPostDetail, listMyPosts, listPosts, PostGameNotFoundError, PostIndieNotFoundError, type ListPostsParams } from "./posts";
export { addComment, listComments, listMySavedPosts, toggleLike, toggleSave } from "./reactions";
export { countUnseenCommentsOnMyPosts, listCommentsOnMyPosts, markCommentsSeen, MY_COMMENTS_WINDOW_DAYS, MY_REACTION_WINDOW_DAYS } from "./inbox";
export { getBoardHome } from "./home";
export { getPostGameCard } from "./game";
export { countCommunityToday, listCommentsForAdmin, listPostsForAdmin, moderateComment, moderatePost, POST_ADMIN_LIMIT, POST_ADMIN_TABS, type ModerationDecision, type PostAdminTab } from "./admin";
