import { useCallback, useEffect, useState } from 'react';
import type { ColorMode } from '../theme';

const STORAGE_KEY = 'routeme.colorMode';

function readStoredMode(): ColorMode | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'dark' || raw === 'light' ? raw : null;
  } catch {
    return null;
  }
}

function systemMode(): ColorMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorMode() {
  const [mode, setMode] = useState<ColorMode>(() => readStoredMode() ?? systemMode());

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // 隐私模式下 localStorage 可能不可写，主题仍对当前会话生效。
    }
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((previous) => (previous === 'dark' ? 'light' : 'dark'));
  }, []);

  return { mode, toggleMode };
}