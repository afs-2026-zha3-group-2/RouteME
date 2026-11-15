import { useCallback, useEffect, useState } from 'react';
import { loadTrip } from '../api';
import type { TripDetail } from '../types';

export type TripState =
  | { status: 'loading' }
  | { status: 'ready'; trip: TripDetail }
  | { status: 'failed'; code: string };

export function useTrip(userId: number, tripId: number) {
  const [state, setState] = useState<TripState>({ status: 'loading' });

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadTrip(userId, tripId)
      .then((trip) => setState({ status: 'ready', trip }))
      .catch((error: unknown) => {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        setState({ status: 'failed', code });
      });
  }, [userId, tripId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload };
}