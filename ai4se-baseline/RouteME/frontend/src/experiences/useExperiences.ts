import { useCallback, useEffect, useState } from 'react';
import { loadExperiences } from '../api';
import { usePaging } from '../shell/usePaging';
import type { Experience } from '../types';
import type { FilterState } from '../trips/tripFilters';

export type ExperiencesState =
  | { status: 'loading' }
  | {
      status: 'ready';
      experiences: Experience[];
      page: number;
      size: number;
      total: number;
      totalPages: number;
    }
  | { status: 'failed'; code: string };

export function useExperiences(userId: number, filters: FilterState) {
  const [state, setState] = useState<ExperiencesState>({ status: 'loading' });
  const filterKey = JSON.stringify({
    destinationCode: filters.destinationCode,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    tags: filters.tags,
  });
  const { page, size, setPage, setSize } = usePaging(filterKey);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    loadExperiences(
      userId,
      {
        destination_code: filters.destinationCode === '' ? undefined : filters.destinationCode,
        date_from: filters.dateFrom === '' ? undefined : filters.dateFrom,
        date_to: filters.dateTo === '' ? undefined : filters.dateTo,
        tags: filters.tags.length === 0 ? undefined : filters.tags,
      },
      { page, size },
    )
      .then((result) =>
        setState({
          status: 'ready',
          experiences: result.items,
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
    // filterKey 是筛选条件的结构化快照，避免对象身份每次渲染都触发请求
  }, [userId, filterKey, page, size]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload, page, size, setPage, setSize };
}