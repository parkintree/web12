/**
 * Vite 浏览器入口：把 React 根挂到简历页的 #todo-root 上。
 *
 * 这是全项目唯一一处命令式 DOM 查询——任何 SPA 都需要一个挂载点。
 * 挂载之后，所有列表渲染与交互都由 React 的 state → 虚拟 DOM → 真实 DOM
 * 流程完成，业务组件内部不再有任何命令式 DOM 操作。
 *
 * W12 起在最外层套 ThemeProvider：主题成为跨组件共享的 Context，
 * TodoApp / ThemeToggle / ThemeBadge 都在同一条 Provider 链上。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { TodoApp } from './components/TodoApp';
import { ThemeProvider } from './theme/ThemeContext';
import './style.css';

const container = document.getElementById('todo-root');
if (container === null) {
  throw new Error('缺少 React 挂载点 #todo-root');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <TodoApp />
    </ThemeProvider>
  </StrictMode>,
);
