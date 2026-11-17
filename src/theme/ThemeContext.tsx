/**
 * ThemeContext：全局主题（light / dark）的唯一数据源。
 *
 * 三条设计约定：
 *   1. 惰性初始化：useState 的初始化函数在首次渲染前同步读 localStorage，
 *      因此第一次渲染拿到的就是已保存的主题，不需要「先渲染浅色再 Effect 改」。
 *   2. 单 Effect 写入：只用一个 useEffect 同时负责两件事——
 *      把 data-theme 写到 <html>（CSS 据此切换变量）、把 theme 写回存储。
 *      依赖只有 [theme, storage]，不存在「读取 Effect + 写入 Effect」互相覆盖。
 *   3. value 用 useMemo 保持引用稳定：主题不变时消费者不会因为 Provider
 *      重新渲染而跟着重渲染；setTheme / toggleTheme 用 useCallback 固定引用。
 *
 * 消费方式：任意深层组件调用 useTheme() 即可，不必层层传 props。
 * 若组件不在 Provider 内，useTheme 直接抛错，避免拿到 null 后静默失效。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { getLocalStorage } from '../storage/local-storage';
import type { StorageLike } from '../types';
import type { Theme } from '../types';
import {
  nextTheme,
  readStoredTheme,
  writeStoredTheme,
} from './theme-storage';

export interface ThemeContextValue {
  readonly theme: Theme;
  readonly setTheme: (theme: Theme) => void;
  readonly toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  readonly children: ReactNode;
  /** 测试可注入内存存储；不传则用浏览器 localStorage。 */
  readonly storage?: StorageLike | null;
}

export function ThemeProvider({ children, storage }: ThemeProviderProps) {
  const [local] = useState<StorageLike | null>(() =>
    storage === undefined ? getLocalStorage() : storage,
  );

  /* 惰性初始化：函数只在首次挂载时执行一次，读到什么就以什么为首帧主题。 */
  const [theme, setThemeState] = useState<Theme>(() =>
    readStoredTheme(local),
  );

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => nextTheme(prev));
  }, []);

  /* 单 Effect：DOM 属性与持久化一起做，且只在 theme 真正变化时执行。 */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStoredTheme(local, theme);
  }, [local, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内部使用');
  }
  return value;
}
