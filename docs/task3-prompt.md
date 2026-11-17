# 任务 3 的结构化 Prompt

```text
# 角色
资深 React 19 + TypeScript 工程师，熟悉 useEffect 与 localStorage 安全访问。

# 上下文
项目为 W11 组件化待办：TodoApp 是唯一状态容器，todos: readonly Todo[]，
业务函数在 todo-core.ts，已有 49 条测试。下面的持久化代码用读 / 写两个 Effect，
首次挂载时写 Effect 拿到初始 []，会覆盖刚读到的数据；JSON.parse 无保护、
也没有校验顶层是否为数组。

# 任务
改成「安全的单 Effect 持久化」：惰性初始化读取 + 单 Effect 写入，业务行为不变。

# 硬约束（违反任一条视为失败）
1. useState 惰性初始化读取 localStorage，首次渲染即恢复数据。
2. 只保留一个写入 Effect，依赖包含 todos（及 storage）。
3. 删除读取 Effect；不允许双 Effect，不允许用 ref 跳过首帧。
4. 读取 try-catch；JSON.parse try-catch；Array.isArray 校验；
   单条脏数据可丢弃或修复，不整页崩溃。
5. 写入 try-catch，失败给提示，不打断渲染。
6. 不改业务规则与已有测试。
7. 不用 any / as any / @ts-ignore，外部数据按 unknown 收窄。
8. storage key 保持 'todos'。

# 要求
复用 todo-core.ts 的 loadTodos / saveTodos，Effect 内只保存。
输出：核心代码 + 双 Effect 覆盖 / 非法 JSON / 非数组分别由哪段修掉 +
依赖 / 生命周期 / 数据正确性三层自检 + 需要人类决定的问题。

# 自检
- 只剩一个写入 Effect？
- 写入 Effect 的依赖包含 todos？
- 首次挂载写入的是恢复后的数据而非 []？
- 非法 JSON / 非数组 / 脏数据都不白屏？
- 刷新后主题与待办是否都还在？
```
