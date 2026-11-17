import { useState } from 'react';
import { message } from 'antd';
import { likeExperience, unlikeExperience } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import { applyLikeState, canLike } from './experienceLikes';
import type { Experience } from '../types';

type Props = {
  experience: Experience;
  currentUserId: number;
  onChange: (experience: Experience) => void;
};

/**
 * 体验点赞按钮：自己的体验不渲染；点击先乐观更新，失败回滚并提示。
 * 首页体验卡与行程详情体验区共用。
 */
export function ExperienceLikeButton({ experience, currentUserId, onChange }: Props) {
  const [pending, setPending] = useState(false);

  if (!canLike(experience, currentUserId, true)) {
    return null;
  }

  const liked = experience.is_liked;
  const label = liked ? tripMessages.experienceLiked : tripMessages.experienceLike;

  const toggle = async () => {
    if (pending) {
      return;
    }
    const optimistic = applyLikeState(experience, !liked);
    setPending(true);
    onChange(optimistic);
    try {
      if (liked) {
        await unlikeExperience(currentUserId, experience.id);
      } else {
        const result = await likeExperience(currentUserId, experience.id);
        onChange({ ...optimistic, like_count: result.like_count, is_liked: result.is_liked });
      }
    } catch {
      onChange(experience);
      message.error(tripMessages.experienceLikeFailed);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className={`exp-like${liked ? ' is-liked' : ''}`}
      aria-pressed={liked}
      aria-label={`${label}，${tripMessages.experienceLikeCountUnit} ${experience.like_count}`}
      disabled={pending}
      onClick={() => {
        void toggle();
      }}
    >
      <svg
        className="ic"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 16.6s-6.6-4-6.6-8.2a3.8 3.8 0 0 1 6.6-2.6 3.8 3.8 0 0 1 6.6 2.6c0 4.2-6.6 8.2-6.6 8.2Z" />
      </svg>
      <b>{experience.like_count}</b>
    </button>
  );
}
