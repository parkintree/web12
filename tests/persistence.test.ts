import { describe, expect, it } from 'vitest';

import { loadTodos, saveTodos } from '../src/todo-core';
import type { StorageLike } from '../src/types';

const KEY = 'todos';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('任务 3：安全持久化（loadTodos / saveTodos）', () => {
  it('合法数据按原顺序恢复，id 仍是 number', () => {
    const storage = memoryStorage({
      todos: '[{"id":1,"text":"测试任务","completed":false}]',
    });
    const loaded = loadTodos(storage, KEY);
    expect(loaded.todos).toEqual([
      { id: 1, text: '测试任务', completed: false },
    ]);
    expect(loaded.discarded).toBe(0);
  });

  it('非法 JSON 不抛异常，返回空列表', () => {
    expect(loadTodos(memoryStorage({ todos: '{bad' }), KEY).todos).toEqual([]);
  });

  it('顶层不是数组时返回空列表', () => {
    for (const raw of ['{"id":1}', 'null', '"text"', '42']) {
      expect(loadTodos(memoryStorage({ todos: raw }), KEY).todos).toEqual([]);
    }
  });

  it('读取抛异常 / storage 不可用时返回空列表', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
    };
    expect(loadTodos(throwing, KEY).todos).toEqual([]);
    expect(loadTodos(null, KEY).todos).toEqual([]);
  });

  it('写入失败返回 false，不把异常抛给 React 渲染', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveTodos(throwing, KEY, [])).toBe(false);
    expect(saveTodos(null, KEY, [])).toBe(false);
  });

  it('首次写入的值来自惰性初始化结果，而不是空数组', () => {
    const seeded = '[{"id":1,"text":"测试任务","completed":false}]';
    const writes: string[] = [];
    const storage: StorageLike = {
      getItem: () => seeded,
      setItem: (_key, value) => void writes.push(value),
    };

    /* 模拟组件：useState(() => loadTodos(...)) 得到首帧 todos。 */
    const initialTodos = loadTodos(storage, KEY).todos;
    saveTodos(storage, KEY, initialTodos);

    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toBe('[]');
    expect(JSON.parse(String(writes[0]))).toEqual([
      { id: 1, text: '测试任务', completed: false },
    ]);
  });
});
