import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THEME,
  isTheme,
  nextTheme,
  readStoredTheme,
  resolveTheme,
  themeLabel,
  writeStoredTheme,
} from '../src/theme/theme-storage';
import type { StorageLike } from '../src/types';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('主题存储：安全读取', () => {
  it('没有保存值时回落到 light', () => {
    expect(readStoredTheme(memoryStorage())).toBe(DEFAULT_THEME);
  });

  it('保存 dark / light 时原样恢复', () => {
    expect(readStoredTheme(memoryStorage({ theme: 'dark' }))).toBe('dark');
    expect(readStoredTheme(memoryStorage({ theme: 'light' }))).toBe('light');
  });

  it('非法值（大小写 / 空格 / 任意字符串）回落到 light', () => {
    for (const raw of ['DARK', ' dark ', 'blue', '', 'null', '{}']) {
      expect(readStoredTheme(memoryStorage({ theme: raw }))).toBe('light');
    }
  });

  it('storage 为 null 或读取抛异常时回落到 light，不把异常抛给页面', () => {
    expect(readStoredTheme(null)).toBe('light');
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
    };
    expect(readStoredTheme(throwing)).toBe('light');
  });
});

describe('主题存储：写入与类型守卫', () => {
  it('写入成功后能读回同一个值', () => {
    const storage = memoryStorage();
    expect(writeStoredTheme(storage, 'dark')).toBe(true);
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('storage 为 null / 写入抛异常时返回 false，不打断渲染', () => {
    expect(writeStoredTheme(null, 'dark')).toBe(false);
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(writeStoredTheme(throwing, 'dark')).toBe(false);
  });

  it('isTheme 只接受两个字面量，resolveTheme 把其余输入归一', () => {
    expect(isTheme('light')).toBe(true);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('Dark')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(resolveTheme('DARK')).toBe('light');
  });

  it('nextTheme / themeLabel 双向切换且文案固定', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
    expect(themeLabel('light')).toBe('浅色');
    expect(themeLabel('dark')).toBe('深色');
  });
});
