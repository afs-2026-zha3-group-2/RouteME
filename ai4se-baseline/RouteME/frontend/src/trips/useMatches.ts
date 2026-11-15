import { useCallback, useEffect, useState } from 'react';
import { loadMatches } from '../api';
import type { MatchCandidate } from '../types';
import { toTripFilters, type FilterState } from './tripFilters';

export type MatchesState =
  | { status: 'loading' }
  | { status: 'ready'; matches: MatchCandidate[] }
  | { status: 'failed'; code: string };

export function useMatches(userId: number, filters: FilterState) {
  const [state, setState] = useState<MatchesState>({ status: 'loading' });
  const filterKey = JSON.stringify(toTripFilters(filters));

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadMatches(userId, toTripFilters(filters))
      .then((matches) => setState({ status: 'ready', matches }))
      .catch((error: unknown) => {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        setState({ status: 'failed', code });
      });
    // filterKey 是 filters 的结构化快照，避免对象身份每次渲染都触发请求
  }, [userId, filterKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload };
}