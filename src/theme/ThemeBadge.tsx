/**
 * ThemeBadge：当前主题状态标签（Context 消费者 2）。
 *
 * 与 ThemeToggle 各取所需：本组件只读 theme，不关心如何切换。
 * 两个互不相干的组件共享同一份 Context，正是「跨层级共享状态」的证据。
 */

import { useTheme } from './ThemeContext';
import { themeLabel } from './theme-storage';

export function ThemeBadge() {
  const { theme } = useTheme();

  return (
    <p className="theme-badge" role="status" aria-live="polite">
      当前主题：<strong>{themeLabel(theme)}</strong>
    </p>
  );
}
