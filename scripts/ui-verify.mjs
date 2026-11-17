/**
 * W12 真浏览器验证：Context 主题切换 + useEffect 持久化 + 非法数据恢复。
 *
 * 用 playwright-core 驱动本机 Edge：
 *   1) 起 Vite preview 提供生产构建产物；
 *   2) 主题：默认 light → 切到 dark → 刷新仍是 dark → 切回 light；
 *   3) 待办：新增后刷新仍在；每次变化都由单 Effect 写回；
 *   4) 脏数据：非法 JSON / 顶层非数组 → 页面不崩溃、恢复为空列表；
 *   5) 任务 3：手工种入 key=todos 的「测试任务」，验证首次加载不被 [] 覆盖。
 *
 * 运行前提：npm run build 已生成 dist/。
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const PORT = 4174;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const results = [];
const pageErrors = [];

function record(name, expected, actual, pass) {
  results.push({ name, expected, actual, pass: Boolean(pass) });
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}\n      期望: ${expected}\n      实际: ${actual}`,
  );
}

function same(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  record(name, e, a, a === e);
}

function includes(name, actual, keyword) {
  record(name, `包含「${keyword}」`, actual, String(actual).includes(keyword));
}

async function addByClick(page, text) {
  await page.locator('#todo-input').fill(text);
  await page.locator('#todo-add').click();
}

async function getState(page) {
  return page.evaluate(() => window.__todoState ?? []);
}

async function getStorage(page, key) {
  return page.evaluate((name) => window.localStorage.getItem(name), key);
}

async function themeOf(page) {
  return page.evaluate(
    () => document.documentElement.dataset.theme ?? '(未设置)',
  );
}

async function bodyBackground(page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

async function reload(page) {
  await page.reload({ waitUntil: 'networkidle' });
}

async function seedTodoStorage(page, raw) {
  await page.evaluate((value) => {
    window.localStorage.setItem('todos', value);
  }, raw);
  await reload(page);
}

/* 截图前清除焦点环与鼠标 hover，避免把“按钮聚焦 / 悬停”误读成选中态。 */
async function settleForShot(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(60);
}

async function main() {
  const server = await preview({
    configFile: resolve('vite.config.ts'),
    preview: { port: PORT, strictPort: true },
  });

  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1200 },
    locale: 'zh-CN',
  });
  /* 只在本次会话的首次加载清空；reload 时保留，才能验证恢复。 */
  await context.addInitScript(() => {
    if (window.sessionStorage.getItem('web12.cleared') === null) {
      window.localStorage.clear();
      window.sessionStorage.setItem('web12.cleared', '1');
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

    /* ---------- 0. 初始状态：默认浅色、空列表、两个 Context 消费者 ---------- */
    same('初始主题为 light', await themeOf(page), 'light');
    same('初始 localStorage.theme 为 light', await getStorage(page, 'theme'), 'light');
    same('初始列表为空', await page.locator('#todo-list .todo-item').count(), 0);
    includes(
      'ThemeBadge 显示当前主题',
      await page.locator('.theme-badge').textContent(),
      '当前主题：浅色',
    );
    same(
      'ThemeToggle 存在且 aria-pressed=false',
      await page.locator('#theme-toggle').getAttribute('aria-pressed'),
      'false',
    );

    /* ---------- 1. 新增两条待办，验证单 Effect 写入 ---------- */
    await addByClick(page, '任务A');
    await addByClick(page, '任务B');
    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem('todos');
      return raw !== null && JSON.parse(raw).length === 2;
    });
    same(
      '新增后 localStorage.todos 与 state 一致',
      JSON.parse(await getStorage(page, 'todos')).map((t) => t.text),
      ['任务B', '任务A'],
    );
    same(
      'State 顺序为新项在前',
      (await getState(page)).map((t) => t.text),
      ['任务B', '任务A'],
    );

    /* ---------- 2. 切换到 dark：DOM / 存储 / 视觉三层同时生效 ---------- */
    const lightBg = await bodyBackground(page);
    await page.locator('#theme-toggle').click();
    await page.waitForFunction(
      () => document.documentElement.dataset.theme === 'dark',
    );
    same('点击切换后 data-theme=dark', await themeOf(page), 'dark');
    same('点击切换后 localStorage.theme=dark', await getStorage(page, 'theme'), 'dark');
    same(
      'ThemeToggle aria-pressed 同步为 true',
      await page.locator('#theme-toggle').getAttribute('aria-pressed'),
      'true',
    );
    includes(
      'ThemeBadge 同步为深色',
      await page.locator('.theme-badge').textContent(),
      '当前主题：深色',
    );
    /* 主题色有 0.18s 过渡，等过渡结束再取最终计算值 / 截图。 */
    await page.waitForTimeout(300);
    const darkBg = await bodyBackground(page);
    record(
      '深色主题的页面底色确实变化',
      `${lightBg} → 更暗的 ${darkBg}`,
      darkBg,
      lightBg !== darkBg && darkBg === 'rgb(10, 17, 23)',
    );
    await settleForShot(page);
    await page.locator('section.todo').screenshot({ path: 'docs/ui-dark.png' });

    /* ---------- 3. 刷新：主题与待办都应从 localStorage 恢复 ---------- */
    await reload(page);
    same('刷新后主题仍为 dark', await themeOf(page), 'dark');
    same(
      '刷新后待办仍为两项',
      await page.locator('#todo-list .todo-text').allTextContents(),
      ['任务B', '任务A'],
    );

    /* ---------- 4. 切回 light 并截图（同一份数据） ---------- */
    await page.locator('#theme-toggle').click();
    await page.waitForFunction(
      () => document.documentElement.dataset.theme === 'light',
    );
    same('切回后 data-theme=light', await themeOf(page), 'light');
    await page.waitForTimeout(300);
    await settleForShot(page);
    await page.locator('section.todo').screenshot({ path: 'docs/ui-light.png' });

    await reload(page);
    same('刷新后浅色主题保留', await themeOf(page), 'light');
    same(
      '纯刷新后待办仍在（持久化）',
      await page.locator('#todo-list .todo-text').allTextContents(),
      ['任务B', '任务A'],
    );
    await settleForShot(page);
    await page.locator('section.todo').screenshot({
      path: 'docs/ui-persist.png',
    });

    /* ---------- 5. 非法 JSON：不崩溃、恢复为空列表 ---------- */
    await seedTodoStorage(page, '{not valid json');
    same('非法 JSON 不导致页面崩溃', pageErrors.length, 0);
    same('非法 JSON 恢复为空列表', await page.locator('#todo-list .todo-item').count(), 0);
    same('非法 JSON 的存储被安全归一为 []', await getStorage(page, 'todos'), '[]');

    /* ---------- 6. 顶层不是数组：同样安全回落 ---------- */
    await seedTodoStorage(page, '{"id":1,"text":"不是数组"}');
    same('非数组 JSON 恢复为空列表', await page.locator('#todo-list .todo-item').count(), 0);
    same('非数组 JSON 的存储被安全归一为 []', await getStorage(page, 'todos'), '[]');

    /* ---------- 7. 主题值非法：回落到 light ---------- */
    await page.evaluate(() => window.localStorage.setItem('theme', 'blue'));
    await reload(page);
    same('非法主题值回落到 light', await themeOf(page), 'light');
    same('非法主题值被单 Effect 规范为 light', await getStorage(page, 'theme'), 'light');

    /* ---------- 8. 任务 3 手工验证：种入「测试任务」后首次加载不被覆盖 ---------- */
    const seeded = '[{"id":1,"text":"测试任务","completed":false}]';
    await seedTodoStorage(page, seeded);
    same(
      '首次加载读到「测试任务」',
      await page.locator('#todo-list .todo-text').allTextContents(),
      ['测试任务'],
    );
    same('首次加载后存储仍是原数据，未被 [] 覆盖', await getStorage(page, 'todos'), seeded);
    await reload(page);
    same(
      '再次刷新「测试任务」仍在',
      await page.locator('#todo-list .todo-text').allTextContents(),
      ['测试任务'],
    );
    await settleForShot(page);
    await page.locator('section.todo').screenshot({
      path: 'docs/ui-task3-seed.png',
    });

    /* ---------- 9. 数据摘要 ---------- */
    const summary = [
      `页面列表：${JSON.stringify(await page.locator('#todo-list .todo-text').allTextContents())}`,
      `window.__todoState：${JSON.stringify(await getState(page))}`,
      `localStorage.todos：${await getStorage(page, 'todos')}`,
      `localStorage.theme：${await getStorage(page, 'theme')}`,
      `document.documentElement.dataset.theme：${await themeOf(page)}`,
      `页面异常：${pageErrors.length} 个`,
    ].join('\n');
    writeFileSync('docs/ui-state.txt', summary + '\n', 'utf8');

    /* 任务 3 单独留一份「种入测试任务」的验证记录，便于写进协作日志。 */
    const seededRows = results.filter(
      (row) =>
        row.name.includes('首次加载') ||
        row.name.includes('再次刷新') ||
        row.name.includes('覆盖'),
    );
    writeFileSync(
      'docs/task3-verify.txt',
      [
        '任务 3 动手验证：localStorage 中预置 key=todos 的「测试任务」',
        `时间：${new Date().toLocaleString('zh-CN')}`,
        '步骤：DevTools → Application → Local Storage 写入',
        '  key: todos',
        '  value: [{"id":1,"text":"测试任务","completed":false}]',
        '然后打开页面、检查 localStorage、再刷新一次。',
        '',
        ...seededRows.flatMap((row, index) => [
          `${String(index + 1).padStart(2, '0')}. [${row.pass ? 'PASS' : 'FAIL'}] ${row.name}`,
          `    期望: ${row.expected}`,
          `    实际: ${row.actual}`,
        ]),
      ].join('\n') + '\n',
      'utf8',
    );
  } finally {
    await browser.close();
    await new Promise((done) => server.httpServer.close(done));
  }

  const failed = results.filter((row) => !row.pass);
  const lines = [
    'W12 真浏览器验证（Edge headless + Vite preview）',
    `时间：${new Date().toLocaleString('zh-CN')}`,
    `结果：${results.length - failed.length}/${results.length} 通过`,
    '',
  ];
  for (const [index, row] of results.entries()) {
    lines.push(
      `${String(index + 1).padStart(2, '0')}. [${row.pass ? 'PASS' : 'FAIL'}] ${row.name}`,
      `    期望: ${row.expected}`,
      `    实际: ${row.actual}`,
    );
  }
  if (pageErrors.length > 0) {
    lines.push('', '页面异常：', ...pageErrors.map((error) => `  ${error}`));
  }
  writeFileSync('docs/ui-verify.txt', lines.join('\n') + '\n', 'utf8');

  console.log(`\n结果：${results.length - failed.length}/${results.length} 通过`);
  if (failed.length > 0 || pageErrors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
