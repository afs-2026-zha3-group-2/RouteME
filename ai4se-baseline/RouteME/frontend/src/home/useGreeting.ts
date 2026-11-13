import { useCallback, useEffect, useState } from 'react';
import { loadGreeting } from '../api';
import type { Greeting } from '../types';

export type GreetingState =
  | { status: 'loading' }
  | { status: 'ready'; greeting: Greeting }
  | { status: 'failed'; code: string };

export function useGreeting() {
  const [state, setState] = useState<GreetingState>({ status: 'loading' });

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadGreeting()
      .then((greeting) => setState({ status: 'ready', greeting }))
      .catch((error: unknown) => {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        setState({ status: 'failed', code });
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload };
}
