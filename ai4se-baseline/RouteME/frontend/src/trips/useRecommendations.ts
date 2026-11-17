import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTripRecommendations } from '../api';
import type { RecommendationList } from '../types';

export type RecommendationState =
  | { status: 'loading' }
  | { status: 'ready'; data: RecommendationList }
  | { status: 'failed'; code: string };

/**
 * 推荐请求：请求序号防竞态，只接受最后一次请求的响应。
 * `interestsKey` 变化（用户修改资料兴趣）时重新计算。
 */
export function useRecommendations(userId: number, tripId: number, interestsKey: string) {
  const [state, setState] = useState<RecommendationState>({ status: 'loading' });
  const sequence = useRef(0);

  const reload = useCallback(() => {
    const current = sequence.current + 1;
    sequence.current = current;
    setState({ status: 'loading' });
    loadTripRecommendations(userId, tripId)
      .then((data) => {
        if (sequence.current === current) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (sequence.current !== current) {
          return;
        }
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        setState({ status: 'failed', code });
      });
  }, [userId, tripId]);

  useEffect(() => {
    reload();
  }, [reload, interestsKey]);

  return { state, reload };
}