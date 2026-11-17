# 任务 3：AI 修复后的核心片段

```tsx
function readStoredItems(
  storage: StorageLike | null,
  key: string,
): readonly unknown[] | null {
  if (storage === null) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  return parsed;
}

export function loadTodos(storage, key): LoadTodosResult {
  const items = readStoredItems(storage, key);
  if (items === null) return { todos: [], discarded: 0 };
  /* 逐条校验 + id 去重 / 补齐，保留可用数据 */
  const { candidates, discarded: discardedItems } = collectCandidates(items);
  const usedIds = reserveUniqueIds(candidates);
  const { todos, discarded: discardedIds } = materializeTodos(
    candidates, usedIds, nextCandidateId(usedIds),
  );
  return { todos, discarded: discardedItems + discardedIds };
}

export function saveTodos(storage, key, todos): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(key, JSON.stringify(todos));
    return true;
  } catch {
    return false;
  }
}

export function TodoApp() {
  const [storage] = useState<StorageLike | null>(() => getLocalStorage());

  // 惰性初始化：首次渲染就是「恢复后的 todos」，不是 []
  const [todos, setTodos] = useState<readonly Todo[]>(
    () => loadTodos(storage, 'todos').todos,
  );

  // 单 Effect：只写不读，依赖完整
  useEffect(() => {
    if (!saveTodos(storage, 'todos', todos)) {
      setTip('浏览器本地存储不可用，刷新后本次修改会丢失。');
    }
  }, [storage, todos]);
}
```
