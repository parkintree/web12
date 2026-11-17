# -*- coding: utf-8 -*-
"""把第12周AI协作记录.docx 模板填充为最终协作日志（含截图与代码块）。"""

from pathlib import Path
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "第12周AI协作记录.docx"
OUTPUT = ROOT / "张衡 2024150167 AI协作日志W12.docx"
if len(__import__("sys").argv) > 1:
    OUTPUT = Path(__import__("sys").argv[1]).resolve()

BODY_SIZE = 10.5
CODE_SIZE = 8.3
GRAY = RGBColor(0x59, 0x63, 0x6E)
GREEN = RGBColor(0x0B, 0x7A, 0x0B)
RED = RGBColor(0xC0, 0x39, 0x2B)


# ---------------------------------------------------------------- 基础工具

def clear_runs(paragraph: Paragraph) -> None:
    for run in list(paragraph.runs):
        run._element.getparent().remove(run._element)


def style_run(run, size=BODY_SIZE, bold=False, italic=False,
              name="Calibri", east="Microsoft YaHei", color=None):
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.name = name
    if color is not None:
        run.font.color.rgb = color
    r_pr = run._element.get_or_add_rPr()
    r_fonts = r_pr.find(qn("w:rFonts"))
    if r_fonts is None:
        r_fonts = OxmlElement("w:rFonts")
        r_pr.insert(0, r_fonts)
    r_fonts.set(qn("w:ascii"), name)
    r_fonts.set(qn("w:hAnsi"), name)
    r_fonts.set(qn("w:eastAsia"), east)


def set_text(paragraph: Paragraph, text, bold=False, size=BODY_SIZE,
             color=None, align=None):
    clear_runs(paragraph)
    run = paragraph.add_run(text)
    style_run(run, size=size, bold=bold, color=color)
    if align is not None:
        paragraph.alignment = align


def set_parts(paragraph: Paragraph, parts, size=BODY_SIZE):
    """parts: [(text, bold), ...]"""
    clear_runs(paragraph)
    for text, bold in parts:
        run = paragraph.add_run(text)
        style_run(run, size=size, bold=bold)


def insert_after(anchor: Paragraph, text="", style=None, size=BODY_SIZE,
                 bold=False) -> Paragraph:
    new_p = OxmlElement("w:p")
    anchor._p.addnext(new_p)
    para = Paragraph(new_p, anchor._parent)
    if style is not None:
        para.style = style
    if text:
        run = para.add_run(text)
        style_run(run, size=size, bold=bold)
    return para


def delete_paragraph(paragraph: Paragraph) -> None:
    paragraph._p.getparent().remove(paragraph._p)


def add_bullets_after(anchor: Paragraph, bullets):
    last = anchor
    for parts in bullets:
        para = insert_after(last, style="List Bullet")
        para.paragraph_format.space_after = Pt(1)
        for text, bold in parts:
            run = para.add_run(text)
            style_run(run, size=BODY_SIZE, bold=bold)
        last = para
    return last


def shade_paragraph(paragraph: Paragraph, fill="F4F6F8"):
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    for edge in ("top", "left", "bottom", "right"):
        element = OxmlElement(f"w:{edge}")
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "4")
        element.set(qn("w:space"), "3")
        element.set(qn("w:color"), "D0D7DE")
        p_bdr.append(element)
    p_pr.append(p_bdr)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    p_pr.append(shd)


def replace_with_code(anchor: Paragraph, code: str,
                      keep_together: bool = True) -> Paragraph:
    code = code.strip("\n")
    clear_runs(anchor)
    shade_paragraph(anchor)
    fmt = anchor.paragraph_format
    fmt.space_before = Pt(2)
    fmt.space_after = Pt(4)
    fmt.line_spacing = 1.0
    fmt.left_indent = Inches(0.06)
    fmt.right_indent = Inches(0.06)
    fmt.keep_together = keep_together

    lines = code.split("\n")
    run = anchor.add_run(lines[0])
    for line in lines[1:]:
        run.add_break()
        run.add_text(line)
    style_run(run, size=CODE_SIZE, name="Consolas", east="Microsoft YaHei",
              color=RGBColor(0x24, 0x29, 0x2F))
    return anchor


def replace_with_image(anchor: Paragraph, image: Path, caption: str,
                       width=5.4) -> Paragraph:
    clear_runs(anchor)
    anchor.alignment = WD_ALIGN_PARAGRAPH.CENTER
    anchor.paragraph_format.space_before = Pt(4)
    anchor.paragraph_format.space_after = Pt(2)
    run = anchor.add_run()
    run.add_picture(str(image), width=Inches(width))

    cap = insert_after(anchor, caption, size=9.0)
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_before = Pt(0)
    cap.paragraph_format.space_after = Pt(8)
    for run in cap.runs:
        run.font.color.rgb = GRAY
        run.italic = True
    return cap


def heading(paragraph: Paragraph, text=None, size=12.5):
    if text is None:
        text = paragraph.text
    set_text(paragraph, text, bold=True, size=size)
    for run in paragraph.runs:
        style_run(run, size=size, bold=True, name="Arial")


def bold(paragraph: Paragraph):
    for run in paragraph.runs:
        style_run(run, size=BODY_SIZE, bold=True)


# ---------------------------------------------------------------- 打开模板

doc = Document(str(TEMPLATE))
paras = list(doc.paragraphs)  # 模板没有表格，段落索引与检查时一致

# 标题与抬头
set_text(paras[0], "AI 协作日志 W12", bold=True, size=19,
         align=WD_ALIGN_PARAGRAPH.CENTER)
for run in paras[0].runs:
    style_run(run, size=19, bold=True, name="Arial")

set_text(paras[1], "文件命名：张衡 2024150167 AI协作日志W12.docx",
         size=9.0, color=GRAY)

set_parts(paras[2], [("姓名：", True), ("张衡", False)])
set_parts(paras[3], [("学号：", True), ("2024150167", False)])
set_parts(paras[4], [("使用的AI工具及方式：", True),
                     ("Claude Code + DeepSeek（结构化 Prompt：约束 → 生成 → 三层审查 → 浏览器验证）", False)])
set_parts(paras[5], [("Git 仓库链接：", True),
                     ("https://github.com/parkintree/web12", False)])
set_parts(paras[7], [("任务：", True),
                     ("完成 V4.0 的 Context 主题切换与 useEffect 持久化。包括：", False)])

# 主标题 / 小节标题加粗
for index in (12, 35, 51, 99):
    heading(paras[index], size=12.5)
for index in (14, 17, 20, 21, 25, 29, 32, 37, 41, 45, 48, 67, 71, 74,
              75, 78, 81, 84, 93, 96, 100):
    bold(paras[index])

# ---------------------------------------------------------------- 任务 1

set_text(paras[15], "搭 Context 骨架：", bold=True)
paras[15].style = doc.styles["List Bullet"]
run = paras[15].add_run(
    "用 createContext 建 ThemeContext（theme / setTheme / toggleTheme），"
    "ThemeProvider 包住 TodoApp，useTheme 在 Provider 外直接抛错。"
)
style_run(run)
last = add_bullets_after(paras[15], [
    [("安全读取主题：", True),
     ("readStoredTheme / writeStoredTheme 用 try-catch 包裹，"
      "非法值一律回落到 light。", False)],
    [("单 Effect 同步：", True),
     ("一个 useEffect 同时写 <html> 的 data-theme 和 localStorage，"
      "依赖 [storage, theme]。", False)],
    [("深色 CSS：", True),
     ("侧栏 / 强调色 / 表面 / 输入框拆成独立令牌，"
      "html[data-theme='dark'] 只覆盖令牌。", False)],
    [("两个消费者：", True),
     ("ThemeToggle（切换按钮）与 ThemeBadge（当前主题），"
      "互不传 props，只调用 useTheme()。", False)],
])

set_text(paras[17], "定 Provider 位置：", bold=True)
paras[17].style = doc.styles["List Bullet"]
run = paras[17].add_run(
    "ThemeProvider 放在 main.tsx 的 StrictMode 内、TodoApp 外，整棵树共享一份主题。"
)
style_run(run)
add_bullets_after(paras[17], [
    [("稳定引用：", True),
     ("setTheme / toggleTheme 用 useCallback，value 用 useMemo，"
      "避免无意义的重渲染。", False)],
    [("避免闪白：", True),
     ("index.html 的 <head> 内联脚本在 React 挂载前先设置 data-theme。", False)],
    [("只作用于屏幕：", True),
     ("深色令牌包在 @media screen 内，打印保持浅色。", False)],
    [("补测试：", True),
     ("新增 8 条主题存储单测，并用 Edge 实跑截图。", False)],
])

set_text(
    paras[18],
    "我做的：把 Provider 放到 main.tsx 最外层（StrictMode 内），新增两个只依赖 "
    "useTheme 的消费者，并把主题令牌接入现有简历与待办样式；手动检查切换、刷新、"
    "打印三种场景。",
)

THEME_CODE = r'''
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [storage] = useState<StorageLike | null>(() => getLocalStorage());
  // 惰性初始化：首帧拿到的就是已保存主题
  const [theme, setThemeState] = useState<Theme>(
    () => readStoredTheme(storage),
  );
  const setTheme = useCallback((v: Theme) => setThemeState(v), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => nextTheme(prev)),
    [],
  );

  // 单 Effect：DOM 属性 + 持久化
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStoredTheme(storage, theme);
  }, [storage, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme 必须在 Provider 内使用');
  return value;
}
'''
replace_with_code(paras[23], THEME_CODE)

CONSUMER_CODE = r'''
// 消费者 1：ThemeToggle.tsx
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const target = theme === 'light' ? '深色' : '浅色';
  return (
    <button id="theme-toggle" type="button"
      aria-pressed={theme === 'dark'} onClick={toggleTheme}>
      {theme === 'dark' ? `☾ 切换到${target}` : `☀ 切换到${target}`}
    </button>
  );
}

// 消费者 2：ThemeBadge.tsx
export function ThemeBadge() {
  const { theme } = useTheme();
  return (
    <p className="theme-badge" role="status" aria-live="polite">
      当前主题：<strong>{themeLabel(theme)}</strong>
    </p>
  );
}
'''
replace_with_code(paras[27], CONSUMER_CODE)

cap = replace_with_image(
    paras[30], ROOT / "docs" / "ui-light.png",
    "图 1　light 主题：主题标签“浅色”，按钮文案“切换到深色”", width=5.4,
)
light_cap = insert_after(cap, "")
replace_with_image(
    light_cap, ROOT / "docs" / "ui-dark.png",
    "图 2　dark 主题：整块待办区与页面配色同步切换（同一份 todos 数据）",
    width=5.4,
)

set_text(paras[33], "useContext 拿到 null：", bold=True)
paras[33].style = doc.styles["List Bullet"]
run = paras[33].add_run(
    "最初 useTheme 直接返回 Context 默认值 null，Provider 外使用会崩溃；"
    "改为默认 null + useTheme 内抛错，能直接提示漏了 Provider。"
)
style_run(run)
add_bullets_after(paras[33], [
    [("value 每次都是新对象：", True),
     ("theme 不变也会让消费者重渲染；用 useMemo / useCallback 固定引用。", False)],
    [("首屏闪白：", True),
     ("Effect 在首次绘制后才执行；index.html 内联脚本提前设置 data-theme。", False)],
    [("深色按钮对比度不足：", True),
     ("深色下把实心按钮文字改深色，颜色仍只从令牌取值。", False)],
])

# ---------------------------------------------------------------- 任务 2

LOAD_CODE = r'''
function readStoredItems(storage, key): readonly unknown[] | null {
  if (storage === null) return null;
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch { return null; }              // 读取可能抛 SecurityError
  if (raw === null || raw.trim() === '') return null;

  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return null; }              // 非法 JSON → 空列表
  return Array.isArray(parsed) ? parsed : null;  // 非数组 → 空列表
}

export function loadTodos(storage, key): LoadTodosResult {
  const items = readStoredItems(storage, key);
  if (items === null) return { todos: [], discarded: 0 };

  // 逐条校验；id 缺失 / 重复时补号，只丢不可用条目
  const { candidates, discarded } = collectCandidates(items);
  const usedIds = reserveUniqueIds(candidates);
  const result = materializeTodos(
    candidates, usedIds, nextCandidateId(usedIds),
  );
  return { todos: result.todos, discarded: discarded + result.discarded };
}
'''
replace_with_code(paras[39], LOAD_CODE)

PERSIST_CODE = r'''
const STORAGE_KEY = 'todos';

export function TodoApp() {
  const [storage] = useState<StorageLike | null>(() => getLocalStorage());

  // 惰性初始化：首帧就是恢复后的数据，不是 []
  const [todos, setTodos] = useState<readonly Todo[]>(
    () => loadTodos(storage, STORAGE_KEY).todos,
  );

  // 唯一写入 Effect：只保存，不读取
  useEffect(() => {
    if (!saveTodos(storage, STORAGE_KEY, todos)) {
      setTip('本地存储不可用，本次修改刷新后会丢失。');
    }
  }, [storage, todos]);
}
'''
replace_with_code(paras[43], PERSIST_CODE)

cap = replace_with_image(
    paras[46], ROOT / "docs" / "ui-persist.png",
    "图 3　刷新页面后两条待办仍在（主题与列表都从 localStorage 恢复）",
    width=5.4,
)
test_cap = insert_after(cap, "")
replace_with_image(
    test_cap, ROOT / "docs" / "test-success-compact.png",
    "图 4　npm test：4 个文件 55 条用例全部通过（含持久化 6 条、主题 8 条）",
    width=5.2,
)

set_text(paras[49], "双 Effect 首帧覆盖：", bold=True)
paras[49].style = doc.styles["List Bullet"]
run = paras[49].add_run(
    "读写 Effect 并存时，写 Effect 首帧捕获的 todos 还是 []，会先清空存储；"
    "改为惰性初始化后首帧即恢复结果，无需 ref 跳过首帧。"
)
style_run(run)
add_bullets_after(paras[49], [
    [("JSON.parse 未保护：", True),
     ("脏数据会抛错白屏；readStoredItems 用 try-catch 兜底。", False)],
    [("顶层不是数组：", True),
     ("用 Array.isArray 校验后才进入业务层。", False)],
    [("写入 Effect 漏 todos：", True),
     ("依赖写全为 [storage, todos]，增删改都会落盘。", False)],
])

# ---------------------------------------------------------------- 任务 3

TARGET_CODE = r'''
function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) setTodos(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);
}
'''
replace_with_code(paras[54], TARGET_CODE)
for paragraph in paras[55:67]:
    delete_paragraph(paragraph)

PROMPT = (ROOT / "docs" / "task3-prompt.md").read_text(encoding="utf-8")
match = re.search(r"```text\n(.*?)```", PROMPT, re.S)
assert match is not None
replace_with_code(paras[69], match.group(1), keep_together=False)

FIXED = (ROOT / "docs" / "task3-ai-fixed-snippet.md").read_text(encoding="utf-8")
match = re.search(r"```tsx\n(.*?)```", FIXED, re.S)
assert match is not None
replace_with_code(paras[72], match.group(1))

set_text(
    paras[76],
    "没有漏。依赖 [storage, todos]：storage 来自一次探测、引用稳定；todos "
    "是会变的业务状态，漏掉就只在挂载时写一次。Effect 内只 saveTodos 和"
    "失败提示，不 setTodos，因此也不会循环写入。",
)

set_text(
    paras[79],
    "没有读取 Effect，就不需要清理函数；读取已在 useState 惰性初始化中，"
    "只执行一次。StrictMode 会重复调用 Effect，但两次写入内容相同、幂等；"
    "没有「读 → setState → 再写」的竞争。",
)

set_text(
    paras[82],
    "首次写入的是惰性初始化读出的 todos，不是默认 []：初始化在首帧渲染前"
    "执行，Effect 闭包里已是恢复数据，写回只是序列化同一份数据。读取有 "
    "getItem / JSON.parse 两层 try-catch + Array.isArray，单条脏数据再由 "
    "collectCandidates 丢弃或修复。",
)

set_text(paras[89], "① 是否读到了“测试任务”？——读到了。", bold=True)
run = paras[89].add_run(
    "列表显示「测试任务」，state 为 "
    "[{id:1,text:'测试任务',completed:false}]。"
)
style_run(run)

set_text(paras[90], "② localStorage 是否被覆盖成空数组？——没有。", bold=True)
run = paras[90].add_run(
    "加载后 localStorage.todos 仍是原 JSON，不是 []。"
)
style_run(run)

set_text(paras[91], "③ 刷新页面数据是否还在？——仍在。", bold=True)
run = paras[91].add_run("再次刷新列表仍有「测试任务」。")
style_run(run)

paras[93].paragraph_format.keep_with_next = True
set_text(
    paras[94],
    "结论：未被覆盖，修复版有效。Edge headless + Vite preview 先种入原 JSON，"
    "再打开 / 读取存储 / 刷新，三项断言全部 PASS，见 docs/task3-verify.txt。"
    "靶子代码首个提交的 Effect 捕获初始 []，会先写空数组；修复版首帧即恢复结果，"
    "首个写入就是原数据。",
)
verify_cap = insert_after(paras[94], "")
replace_with_image(
    verify_cap, ROOT / "docs" / "task3-verify.png",
    "图 5　任务 3 动手验证输出（3/3 PASS：读到、未被覆盖、刷新仍在）",
    width=5.4,
)

set_text(paras[97], "部分修改。", bold=True)
last = insert_after(
    paras[97],
    "接受：读取改惰性初始化、只保留一个写入 Effect（依赖含 todos）、"
    "读写都做异常兜底——这三点消除了双 Effect 覆盖和非法 JSON 白屏。",
)
last.paragraph_format.space_after = Pt(2)
last = insert_after(
    last,
    "修改：不采用「Array.isArray 后整段返回」，保留项目 loadTodos 的逐条"
    "校验与 id 修复；key 固定 todos；storage 统一走 getLocalStorage 写探测；"
    "保留原提示条与业务纯函数。改后 npm test 55/55、浏览器验证 27/27。",
)
last.paragraph_format.space_before = Pt(2)

# ---------------------------------------------------------------- 总结

set_text(
    paras[102],
    "答：Context 负责跨层级共享，关键是 value / setTheme 引用稳定，"
    "否则一次切换全树重渲染；useEffect 负责与外部同步，关键是初始化放进 "
    "useState 惰性求值、副作用只留一个写 Effect，依赖写全、写入幂等，"
    "才能持久化又不覆盖已恢复的数据。",
)
paras[102].paragraph_format.space_before = Pt(4)

note = insert_after(
    paras[102],
    "证据：docs/ui-verify.txt（27 项）、docs/task3-verify.txt（3 项）；"
    "源码：src/theme/、src/components/TodoApp.tsx、src/todo-core.ts。",
    size=8.5,
)
for run in note.runs:
    run.font.color.rgb = GRAY
    run.italic = True

# 模板中独立的 “tsx” 语言标签在代码块成块后显得冗余，删掉以保持版面干净。
for index in (22, 26, 38, 42):
    delete_paragraph(paras[index])

# ---------------------------------------------------------------- 分页优化

def _has_drawing(paragraph: Paragraph) -> bool:
    return paragraph._p.find(".//" + qn("w:drawing")) is not None


def _is_code(paragraph: Paragraph) -> bool:
    return bool(paragraph.paragraph_format.keep_together)


body_children = list(doc.paragraphs)
heading_prefixes = ("一、", "二、", "三、", "四、", "五、", "【", "①", "②", "③")
for i, block in enumerate(body_children):
    if not isinstance(block, Paragraph):
        continue
    text = block.text.strip()
    nxt = body_children[i + 1] if i + 1 < len(body_children) else None

    bold_all = bool(block.runs) and all(bool(run.bold) for run in block.runs)
    is_heading = bold_all and (
        text.startswith(heading_prefixes) or re.match(r"^\d+\.\s", text) is not None
    )

    keep = is_heading
    if isinstance(nxt, Paragraph):
        if _is_code(nxt):
            keep = True
        elif _has_drawing(nxt) and not text.startswith("图 "):
            keep = True
    if (_has_drawing(block) and isinstance(nxt, Paragraph)
            and nxt.text.strip().startswith("图 ")):
        keep = True
    if keep:
        block.paragraph_format.keep_with_next = True

# 文档属性
doc.core_properties.author = "张衡"
doc.core_properties.title = "AI 协作日志 W12"
doc.core_properties.subject = "V4.0 Context 主题切换与 useEffect 持久化"

doc.save(str(OUTPUT))
print(f"saved: {OUTPUT}")
