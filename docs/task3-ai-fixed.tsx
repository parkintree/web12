/**
 * 任务 3：AI 修复后的核心片段（用于 docs 与协作日志引用）。
 *
 * 关键差异：
 *   1. 读取从「第二个 Effect」搬到 useState 惰性初始化；
 *   2. 只剩一个写入 Effect，依赖 [storage, todos]；
 *   3. loadTodos 内含 try-catch + Array.isArray + 逐条校验；
 *   4. saveTodos 写入失败返回 false，UI 只提示，不抛异常。
 */

const STORAGE_KEY = 'todos';

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

export function loadTodos(
  storage: StorageLike | null,
  key: string,
): LoadTodosResult {
  const items = readStoredItems(storage, key);
  if (items === null) return { todos: [], discarded: 0 };

  /* 逐条校验：形状不对的丢弃，id 缺失 / 重复的重新编号。 */
  const { candidates, discarded: discardedItems } = collectCandidates(items);
  const usedIds = reserveUniqueIds(candidates);
  const { todos, discarded: discardedIds } = materializeTodos(
    candidates,
    usedIds,
    nextCandidateId(usedIds),
  );
  return { todos, discarded: discardedItems + discardedIds };
}

export function saveTodos(
  storage: StorageLike | null,
  key: string,
  todos: readonly Todo[],
): boolean {
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

  /* 惰性初始化：首次渲染拿到的就是已恢复数据，不是 []。 */
  const [todos, setTodos] = useState<readonly Todo[]>(
    () => loadTodos(storage, STORAGE_KEY).todos,
  );

  /* 单 Effect：只写不读，依赖完整。 */
  useEffect(() => {
    if (!saveTodos(storage, STORAGE_KEY, todos)) {
      setTip('浏览器本地存储不可用，刷新后本次修改会丢失。');
    }
  }, [storage, todos]);

  /* 业务逻辑不变：新增 / 切换 / 删除仍走 todo-core 纯函数 */
  // ...
}
