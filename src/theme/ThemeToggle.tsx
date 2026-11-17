/**
 * ThemeToggle：主题切换按钮（Context 消费者 1）。
 *
 * 它不接收任何主题相关的 props——theme 与 toggleTheme 全部来自
 * useTheme()。这样即使以后把按钮挪到简历页头，也不需要改调用链。
 */

import { useTheme } from './ThemeContext';
import { themeLabel } from './theme-storage';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const target = themeLabel(theme === 'light' ? 'dark' : 'light');

  return (
    <button
      id="theme-toggle"
      className="theme-toggle"
      type="button"
      aria-pressed={theme === 'dark'}
      aria-label={`切换到${target}主题`}
      title={`切换到${target}主题`}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === 'dark' ? '☾' : '☀'}
      </span>
      <span className="theme-toggle-text">{`切换到${target}`}</span>
    </button>
  );
}
