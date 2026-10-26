// 인디 상세의 "관련 소식"(기획서 S-19). 그 게임을 올린 개발자의 라운지 글(개발일지, 질문 피드백) 최신 몇 개.
// 글과 게임을 잇는 칸이 아직 없어 글쓴이로 잇는다(services/indie/lounge 머리 주석).
// 상세 본문을 기다리게 하지 않으려고 스스로 묻는다 — 부르는 쪽이 Suspense 로 감싼다. 장애면 마디를 통째로 접는다(소식은 덤이다).
import Link from "next/link";
import { PostList } from "@/components/community/post-list";
import { SectionHead, sectionCardClass } from "@/components/ui/page";
import { writePath } from "@/lib/community/constants";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { INDIE_MESSAGES as M } from "@/lib/indie/messages";
import { buttonClass } from "@/components/ui/button";
import { listAuthorLoungePosts } from "@/server/services/indie";

/** 마디에 세우는 글 수 — 소개를 다 읽은 사람이 훑어볼 만큼. 더 보려면 글 상세에서 이어 간다 */
const RELATED_LIMIT = 5;

export async function IndieRelatedNews({ authorUserId, isOwner }: { authorUserId: string; isOwner: boolean }) {
  const posts = await nullIfDbUnavailable(listAuthorLoungePosts(authorUserId, RELATED_LIMIT));
  if (!posts) return null;
  // 남의 게임에서 빈 마디는 아무 말도 안 하는 칸이라 접는다. 본인에게는 첫 개발일지를 권하는 자리로 둔다
  if (posts.length === 0 && !isOwner) return null;
  return (
    <section aria-labelledby="indie-related" className={sectionCardClass("flex flex-col gap-3")}>
      <SectionHead id="indie-related" title={M.relatedTitle} />
      <p className="-mt-1 text-[13px] text-dim">{M.relatedLead}</p>
      {posts.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-inset)] bg-surface-2 px-4 py-4">
          <p className="text-[14px] font-bold text-ink">{M.relatedEmpty}</p>
          <p className="text-[12.5px] text-dim">{M.relatedEmptyOwner}</p>
          <Link href={writePath("devlog")} className={buttonClass({ size: "sm" })}>
            {M.relatedWrite}
          </Link>
        </div>
      ) : (
        <PostList bare posts={posts} />
      )}
    </section>
  );
}
