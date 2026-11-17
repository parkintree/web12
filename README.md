# Web W12 · Context 主题切换 + useEffect 持久化

在 W11 的 React 组件化待办清单之上完成三件事：

1. **Context 主题切换**：`ThemeContext` 提供 `theme / setTheme / toggleTheme`，
   `ThemeToggle` 与 `ThemeBadge` 两个互不相干的组件用 `useContext` 消费；
   CSS 用 `html[data-theme='dark']` 覆盖配色令牌，整页跟随切换。
2. **useEffect 持久化**：`useState` 惰性初始化读取 `localStorage.todos`，
   只保留一个写入 Effect（依赖 `[storage, todos]`），彻底去掉「读取 Effect +
   写入 Effect」互相覆盖的双 Effect 写法；非法 JSON、非数组、单条脏数据都由
   `todo-core.ts` 的 `loadTodos` 安全处理。
3. **AI 持久化逻辑三层审查**：按「依赖 → 生命周期 → 数据正确性」审查 AI 修复版，
   并用真实浏览器种入 `key=todos` 的测试数据，验证首次加载不被 `[]` 覆盖。

## 目录结构

```
index.html                    简历页；<head> 内联主题预载脚本，避免刷新闪白
src/
  main.tsx                    入口：ThemeProvider → TodoApp（StrictMode）
  theme/
    ThemeContext.tsx          createContext + Provider + useTheme；惰性初始化 + 单 Effect
    theme-storage.ts          主题的安全读写 / 类型守卫 / nextTheme
    ThemeToggle.tsx           Context 消费者 1：切换按钮
    ThemeBadge.tsx            Context 消费者 2：当前主题标签
  components/
    TodoApp.tsx               唯一状态容器；todos 惰性初始化 + 单 Effect 持久化
    TodoForm.tsx / TodoList.tsx / TodoItem.tsx
    （沿用 W11：props 向下、回调向上、不可变更新）
  storage/local-storage.ts    localStorage 可用性探测
  todo-core.ts                沿用 W10/W11 纯函数数据层（含安全 loadTodos / saveTodos）
  types.ts                    Todo / TodoFilter / Theme / StorageLike
  style.css                   简历 + 待办样式；第 8 节为深色主题令牌
tests/
  todo-core.handwritten.test.ts   19 条
  todo-core.ai-patched.test.ts    22 条
  theme-storage.test.ts            8 条（主题安全读写 / 非法值回落）
  persistence.test.ts              6 条（loadTodos / saveTodos / 首次写入不是 []）
scripts/
  ui-verify.mjs               Edge headless 真浏览器验证（主题 / 持久化 / 脏数据 / 任务 3）
  render-terminal.mjs         把真实命令输出渲染成终端截图
  build_w12_docx.py           由模板生成最终协作日志 docx
  preview_docx.py             导出 PDF 并逐页渲染 PNG，检查分页
docs/                         验证输出、截图、任务 3 的 Prompt / 修复片段
```

## 运行

```bash
npm install
npm run dev         # 开发服务器
npm run build       # tsc --noEmit && vite build
npm test            # vitest run，55 条
npm run ui:verify   # 需先 build；启动 preview + Edge，27 项真浏览器验证
npm run verify      # build + test
```

## 持久化设计（单 Effect）

```tsx
const [storage] = useState<StorageLike | null>(() => getLocalStorage());
const [todos, setTodos] = useState<readonly Todo[]>(
  () => loadTodos(storage, STORAGE_KEY).todos,   // 惰性初始化
);

useEffect(() => {                                // 唯一写入 Effect
  if (!saveTodos(storage, STORAGE_KEY, todos)) {
    setTip('浏览器本地存储不可用，刷新后本次修改会丢失。');
  }
}, [storage, todos]);
```

首帧的 `todos` 已经是「恢复后的数据」，因此首次写入的也是这份数据，
不会出现靶子代码里「写入 Effect 拿到初始 `[]` 并覆盖存储」的问题。

## 验证证据

- `npm test`：55/55 通过（4 个测试文件）。
- `npm run ui:verify`：27/27 通过，见 `docs/ui-verify.txt`；
  截图 `docs/ui-light.png`、`docs/ui-dark.png`、`docs/ui-persist.png`。
- 任务 3 手工验证：`docs/task3-verify.txt`（种入「测试任务」后首次加载、
  存储值、再刷新三项全部 PASS）。
