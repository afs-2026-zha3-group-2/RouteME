import { useCallback, useEffect, useState } from 'react';
import { loadMatches } from '../api';
import type { MatchCandidate } from '../types';
import { usePaging } from '../shell/usePaging';
import { toTripFilters, type FilterState } from './tripFilters';

export type MatchesState =
  | { status: 'loading' }
  | {
      status: 'ready';
      matches: MatchCandidate[];
      page: number;
      size: number;
      total: number;
      totalPages: number;
    }
  | { status: 'failed'; code: string };

export function useMatches(userId: number, filters: FilterState) {
  const [state, setState] = useState<MatchesState>({ status: 'loading' });
  const filterKey = JSON.stringify(toTripFilters(filters));
  const { page, size, setPage, setSize } = usePaging(filterKey);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadMatches(userId, toTripFilters(filters), { page, size })
      .then((result) =>
        setState({
          status: 'ready',
          matches: result.items,
          page: result.page,
          size: result.size,
          total: result.total,
          totalPages: result.total_pages,
        }),
      )
      .catch((error: unknown) => {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        setState({ status: 'failed', code });
      });
    // filterKey 是 filters 的结构化快照，避免对象身份每次渲染都触发请求
  }, [userId, filterKey, page, size]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload, page, size, setPage, setSize };
}