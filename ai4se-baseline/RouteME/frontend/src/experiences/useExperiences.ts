import { useCallback, useEffect, useState } from 'react';
import { loadExperiences } from '../api';
import type { Experience } from '../types';
import type { FilterState } from '../trips/tripFilters';

export type ExperiencesState =
  | { status: 'loading' }
  | { status: 'ready'; experiences: Experience[] }
  | { status: 'failed'; code: string };

export function useExperiences(userId: number, filters: FilterState) {
  const [state, setState] = useState<ExperiencesState>({ status: 'loading' });
  const filterKey = JSON.stringify({
    q: filters.q.trim(),
    destination: filters.destination,
    tags: filters.tags,
  });

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadExperiences(userId, {
      q: filters.q.trim() === '' ? undefined : filters.q.trim(),
      destination: filters.destination === '' ? undefined : filters.destination,
      tags: filters.tags.length === 0 ? undefined : filters.tags,
    })
      .then((experiences) => setState({ status: 'ready', experiences }))
      .catch((error: unknown) => {
        const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        setState({ status: 'failed', code });
      });
    // filterKey 是筛选条件的结构化快照，避免对象身份每次渲染都触发请求
  }, [userId, filterKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload };
}