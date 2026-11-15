import { useState } from 'react';
import { DEFAULT_PAGE_SIZE } from './paging';

type PagingState = {
  key: string;
  page: number;
  size: number;
};

/**
 * 分页状态：页码与筛选条件绑定，条件变化时立即回到第 1 页（无需额外请求），
 * 直到用户再次翻页或改容量才写回状态。
 */
export function usePaging(filterKey: string, initialSize = DEFAULT_PAGE_SIZE) {
  const [state, setState] = useState<PagingState>({ key: filterKey, page: 1, size: initialSize });
  const current = state.key === filterKey ? state : { key: filterKey, page: 1, size: state.size };

  const setPage = (page: number) => setState({ key: filterKey, page: Math.max(1, page), size: current.size });
  const setSize = (size: number) => setState({ key: filterKey, page: 1, size });

  return { page: current.page, size: current.size, setPage, setSize };
}