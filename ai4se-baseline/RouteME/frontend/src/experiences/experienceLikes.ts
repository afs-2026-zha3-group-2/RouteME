import type { Experience } from '../types';

/**
 * 点赞 / 取消点赞的乐观状态：只改当前这条体验的赞数与点赞态。
 *
 * <p>目标态与当前态相同则原样返回，避免重复点击造成 ±2。</p>
 */
export function applyLikeState(experience: Experience, liked: boolean): Experience {
  if (experience.is_liked === liked) {
    return experience;
  }
  return {
    ...experience,
    is_liked: liked,
    like_count: liked
      ? experience.like_count + 1
      : Math.max(0, experience.like_count - 1),
  };
}

/**
 * 是否可以点赞：需要已登录，且不能是自己的体验（服务端仍会校验）。
 */
export function canLike(experience: Experience, currentUserId: number, isAuthenticated: boolean): boolean {
  return isAuthenticated && experience.author.id !== currentUserId;
}
