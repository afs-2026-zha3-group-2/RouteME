import { useEffect, useState } from 'react';

const NARROW_QUERY = '(max-width: 767px)';

/** 后台三栏工作台在 768px 以下收为单栏；仅用于决定点击队列时是否跳转详情路由。 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return narrow;
}