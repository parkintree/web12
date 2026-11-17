/**
 * 主题的存储适配层（纯函数，不读全局变量）。
 *
 * localStorage 与用户输入一样不可信：隐私模式下读取可能抛异常，
 * 历史数据也可能被手动改成任意字符串。因此读取时先 try-catch，
 * 再用类型守卫把 unknown 收窄成 Theme，非法值一律回落到 light。
 */

import type { StorageLike, Theme } from '../types';

export const THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME: Theme = 'light';

const THEMES: readonly Theme[] = ['light', 'dark'];

/** 运行时类型守卫：只接受 light / dark 两个字面量。 */
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** 把任意输入归一到合法主题，供存储读取与 UI 共用。 */
export function resolveTheme(value: unknown): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

/**
 * 惰性初始化用：在 useState 的初始化函数里同步调用一次。
 * 读取失败 / 没有值 / 值非法，全部回落到 DEFAULT_THEME。
 */
export function readStoredTheme(storage: StorageLike | null): Theme {
  if (storage === null) {
    return DEFAULT_THEME;
  }
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return resolveTheme(raw);
  } catch {
    return DEFAULT_THEME;
  }
}

/** 写入失败只返回 false，由 Provider 忽略，不打断渲染。 */
export function writeStoredTheme(
  storage: StorageLike | null,
  theme: Theme,
): boolean {
  if (storage === null) {
    return false;
  }
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/** 主题文案集中在一处，按钮与状态标签不会各写一份。 */
export function themeLabel(theme: Theme): string {
  return theme === 'dark' ? '深色' : '浅色';
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light';
}

export function listThemes(): readonly Theme[] {
  return THEMES;
}
