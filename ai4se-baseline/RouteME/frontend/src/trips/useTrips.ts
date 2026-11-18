import { useCallback, useEffect, useState } from 'react';
import { loadTrips } from '../api';
import type { TripSummary } from '../types';
import { usePaging } from '../shell/usePaging';
import { toTripFilters, type FilterState } from './tripFilters';

export type TripsState =
  | { status: 'loading' }
  | {
      status: 'ready';
      trips: TripSummary[];
      page: number;
      size: number;
      total: number;
      totalPages: number;
    }
  | { status: 'failed'; code: string };

export function useTrips(userId: number, filters: FilterState) {
  const [state, setState] = useState<TripsState>({ status: 'loading' });
  const filterKey = JSON.stringify(toTripFilters(filters));
  const { page, size, setPage, setSize } = usePaging(filterKey);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadTrips(userId, toTripFilters(filters), { page, size })
      .then((result) =>
        setState({
          status: 'ready',
          trips: result.items,
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