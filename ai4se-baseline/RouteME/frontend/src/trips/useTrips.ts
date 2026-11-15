import { useCallback, useEffect, useState } from 'react';
import { loadTrips } from '../api';
import type { TripSummary } from '../types';
import { toTripFilters, type FilterState } from './tripFilters';

export type TripsState =
  | { status: 'loading' }
  | { status: 'ready'; trips: TripSummary[] }
  | { status: 'failed'; code: string };

export function useTrips(userId: number, filters: FilterState) {
  const [state, setState] = useState<TripsState>({ status: 'loading' });
  const filterKey = JSON.stringify(toTripFilters(filters));

  const reload = useCallback(() => {
    setState({ status: 'loading' });
      loadTrips(userId, toTripFilters(filters))
      .then((trips) => setState({ status: 'ready', trips }))
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