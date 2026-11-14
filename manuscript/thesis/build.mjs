// 论文 Word 排版脚本
// 依据：《南京航空航天大学研究生学位论文撰写要求》（2015 年 4 月修订），见 FORMAT.md。
// 用法：cd manuscript/thesis && npm install && npm run build
// 输入：src/meta.json 列出的源文件；输出：thesis-draft.docx 与 build-report.md。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from 'docx';
import JSZip from 'jszip';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const OUT = path.join(HERE, 'thesis-draft.docx');
const REPORT = path.join(HERE, 'build-report.md');

const meta = JSON.parse(fs.readFileSync(path.join(SRC, 'meta.json'), 'utf8'));
const refsDb = fs.existsSync(path.join(SRC, 'references.json'))
  ? JSON.parse(fs.readFileSync(path.join(SRC, 'references.json'), 'utf8')) : {};

// ---------- 版式常量（撰写要求第四部分） ----------
const cm = (x) => Math.round(x * 567);
const PAGE = { width: 11906, height: 16838 }; // A4
const MARGIN = { top: cm(3.3), bottom: cm(3.3), left: cm(3.0), right: cm(2.8), header: cm(2.6), footer: cm(2.6) };
const TEXT_W = PAGE.width - MARGIN.left - MARGIN.right;
const SZ = { chu: 84, yi: 52, er: 44, xiaoer: 36, san: 32, xiaosan: 30, si: 28, xiaosi: 24, wu: 21, xiaowu: 18 };
const SONG = '宋体', HEI = '黑体', KAI = '楷体', TNR = 'Times New Roman';
const F = (cn, en = TNR) => ({ ascii: en, hAnsi: en, eastAsia: cn, cs: en });
const EXACT = D.LineRuleType.EXACT ?? D.LineRuleType.EXACTLY;
const LINE = { line: 400, lineRule: EXACT }; // 固定行距 20 磅
const HALF_LINE = 200; // 0.5 行（按 20 磅行距折算）
const ONE_HALF_LINE = 600; // 1.5 行
const HEADER_ODD = '南京航空航天大学硕士学位论文';

// ---------- 行内解析：加粗、引用、待补标记、代码 ----------
const cite = { order: [], num: new Map() };
const stats = { placeholders: {}, chars: {}, figures: [], tables: [], missingRefs: new Set() };
let currentFile = '';

function citeNumbers(keys) {
  const nums = keys.map((k) => {
    if (!cite.num.has(k)) { cite.order.push(k); cite.num.set(k, cite.order.length); }
    if (!refsDb[k]) stats.missingRefs.add(k);
    return cite.num.get(k);
  }).sort((a, b) => a - b);
  const parts = []; let i = 0;
  while (i < nums.length) {
    let j = i; while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    parts.push(j - i >= 2 ? `${nums[i]}-${nums[j]}` : nums.slice(i, j + 1).join(','));
    i = j + 1;
  }
  return `[${parts.join(',')}]`;
}

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[@[^\]]+\]|〔[^〕]*〕|`[^`]+`)/g;
  let last = 0; let m;
  const push = (t, extra = {}) => { if (t) out.push(new D.TextRun({ text: t, ...base, ...extra })); };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(...runs(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith('[@')) {
      const keys = tok.slice(1, -1).split(/[;；,，]/).map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
      push(citeNumbers(keys), { superScript: true });
    } else if (tok.startsWith('〔')) {
      stats.placeholders[currentFile] = (stats.placeholders[currentFile] || 0) + 1;
      push(tok, { highlight: 'yellow' });
    } else push(tok.slice(1, -1), { font: F(SONG, TNR) });
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

const countChars = (t) => (t.match(/[一-鿿]/g) || []).length;

// ---------- 块解析 ----------
// 语法：# / ## / ### / #### 标题；空行分段；"表：表3.1 标题" 后接管道表；
// "图：图3.1 标题 | 路径"（路径可省，省略时排占位框）；"注：" 开头为图表注；
// "1. " 或 "- " 开头为列表项（排成“（1）”段落）；"> " 开头与 <!-- --> 为编辑备注，不进 Word；
// "\newpage" 强制分页。
function parseBlocks(md) {
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  const lines = md.split(/\r?\n/);
  const blocks = []; let para = []; let i = 0;
  const flush = () => { if (para.length) { blocks.push({ type: 'p', text: para.join('') }); para = []; } };
  while (i < lines.length) {
    const line = lines[i]; const t = line.trim();
    if (!t) { flush(); i++; continue; }
    if (t.startsWith('>')) { flush(); i++; continue; }
    if (t === '\\newpage') { flush(); blocks.push({ type: 'pagebreak' }); i++; continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { flush(); blocks.push({ type: 'h', level: m[1].length, text: m[2].trim() }); i++; continue; }
    if ((m = t.match(/^表[：:]\s*(.*)$/))) {
      flush(); const caption = m[1].trim(); i++;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ type: 'table', caption, rows }); continue;
    }
    if ((m = t.match(/^图[：:]\s*(.*)$/))) {
      flush(); const [cap, src] = m[1].split('|').map((s) => s.trim());
      blocks.push({ type: 'fig', caption: cap, src }); i++; continue;
    }
    if (/^注[：:]/.test(t)) { flush(); blocks.push({ type: 'note', text: t }); i++; continue; }
    if ((m = t.match(/^(\d+)[.、]\s+(.*)$/)) || (m = t.match(/^[-*]\s+(.*)$/))) {
      flush();
      const items = [];
      while (i < lines.length) {
        const tt = lines[i].trim();
        const mm = tt.match(/^\d+[.、]\s+(.*)$/) || tt.match(/^[-*]\s+(.*)$/);
        if (!mm) break; items.push(mm[1]); i++;
      }
      blocks.push({ type: 'list', items }); continue;
    }
    para.push(t); i++;
  }
  flush();
  return blocks;
}

// ---------- 元素构造 ----------
const body = (text, opts = {}) => new D.Paragraph({ style: 'Body', children: runs(text), ...opts });
const noIndent = (children, opts = {}) => new D.Paragraph({ style: 'BodyNoIndent', children, ...opts });

function heading(level, text, { inToc = true } = {}) {
  if (!inToc) return new D.Paragraph({ style: 'FrontTitle', children: runs(text), pageBreakBefore: true });
  const map = { 1: D.HeadingLevel.HEADING_1, 2: D.HeadingLevel.HEADING_2, 3: D.HeadingLevel.HEADING_3, 4: D.HeadingLevel.HEADING_4 };
  return new D.Paragraph({ heading: map[level], children: runs(text), pageBreakBefore: level === 1 });
}

function weight(s) { let w = 0; for (const ch of s) w += /[\u0000-ÿ]/.test(ch) ? 0.55 : 1; return w; }

function table(block) {
  const { caption, rows } = block;
  const numbered = /^表\d/.test(caption);
  if (numbered) stats.tables.push(caption);
  const ncol = Math.max(...rows.map((r) => r.length));
  const maxw = Array.from({ length: ncol }, (_, c) => Math.max(2, ...rows.map((r) => weight(r[c] || ''))));
  const capped = maxw.map((w) => Math.min(w, 40));
  const total = capped.reduce((a, b) => a + b, 0);
  let widths = capped.map((w) => Math.max(900, Math.round((TEXT_W * w) / total)));
  const scale = TEXT_W / widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.floor(w * scale));
  widths[widths.length - 1] += TEXT_W - widths.reduce((a, b) => a + b, 0);
  const NONE = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const THICK = { style: D.BorderStyle.SINGLE, size: 12, color: '000000' };
  const THIN = { style: D.BorderStyle.SINGLE, size: 6, color: '000000' };
  const center = maxw.map((w) => w <= 10);
  const trs = rows.map((r, ri) => new D.TableRow({
    tableHeader: ri === 0, cantSplit: true,
    children: Array.from({ length: ncol }, (_, c) => new D.TableCell({
      width: { size: widths[c], type: D.WidthType.DXA },
      margins: { top: 30, bottom: 30, left: 80, right: 80 },
      verticalAlign: D.VerticalAlign.CENTER,
      borders: ri === 0 ? { top: THICK, bottom: THIN, left: NONE, right: NONE }
        : { top: NONE, bottom: ri === rows.length - 1 ? THICK : NONE, left: NONE, right: NONE },
      children: [new D.Paragraph({
        style: 'TableText',
        alignment: ri === 0 || center[c] ? D.AlignmentType.CENTER : D.AlignmentType.LEFT,
        children: runs(r[c] || '', ri === 0 ? { font: F(HEI) } : {}),
      })],
    })),
  }));
  return [
    new D.Paragraph({ style: numbered ? 'TabCaption' : 'TabCaptionPlain', children: runs(caption) }),
    new D.Table({
      width: { size: TEXT_W, type: D.WidthType.DXA }, columnWidths: widths, alignment: D.AlignmentType.CENTER,
      borders: { top: THICK, bottom: THICK, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
      rows: trs,
    }),
  ];
}

function imageSize(buf, ext) {
  if (ext === 'png') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  let i = 2; // jpeg
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return { w: 800, h: 600 };
}

function figure(block, fileDir) {
  stats.figures.push(block.caption);
  const out = [];
  const p = block.src ? path.resolve(fileDir, block.src) : null;
  if (p && fs.existsSync(p)) {
    const buf = fs.readFileSync(p); const ext = path.extname(p).slice(1).toLowerCase().replace('jpeg', 'jpg');
    const { w, h } = imageSize(buf, ext === 'jpg' ? 'jpg' : 'png');
    const maxW = 529; // 14 cm @96dpi
    const sw = Math.min(maxW, w); const sh = Math.round((h * sw) / w);
    out.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, children: [new D.ImageRun({ type: ext === 'jpg' ? 'jpg' : 'png', data: buf, transformation: { width: sw, height: sh } })] }));
  } else {
    stats.placeholders[currentFile] = (stats.placeholders[currentFile] || 0) + 1;
    const box = { style: D.BorderStyle.DASHED, size: 6, color: '808080', space: 8 };
    out.push(new D.Paragraph({
      alignment: D.AlignmentType.CENTER, keepNext: true, spacing: { before: 240, after: 120, line: 400, lineRule: EXACT },
      border: { top: box, bottom: box, left: box, right: box },
      children: [new D.TextRun({ text: `〔图待插${block.src ? '：' + block.src : ''}〕`, highlight: 'yellow' })],
    }));
  }
  out.push(new D.Paragraph({ style: 'FigCaption', children: runs(block.caption) }));
  return out;
}

function renderBlocks(blocks, fileDir, { frontTitle = false } = {}) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'h') out.push(heading(b.level, b.text, { inToc: !(frontTitle && b.level === 1) }));
    else if (b.type === 'p') out.push(body(b.text));
    else if (b.type === 'list') b.items.forEach((it, k) => out.push(body(`（${k + 1}）${it}`)));
    else if (b.type === 'table') out.push(...table(b));
    else if (b.type === 'fig') out.push(...figure(b, fileDir));
    else if (b.type === 'note') out.push(new D.Paragraph({ style: 'Note', children: runs(b.text.replace(/^注[：:]/, '（注：') + '）') }));
    else if (b.type === 'pagebreak') out.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  }
  return out;
}

function loadFile(name, opts) {
  currentFile = name;
  const p = path.join(SRC, name);
  const md = fs.readFileSync(p, 'utf8');
  stats.chars[name] = countChars(md.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !l.trim().startsWith('>')).join('\n'));
  return { blocks: parseBlocks(md), dir: path.dirname(p), opts };
}

// ---------- 页眉页脚 ----------
const headerP = (text) => new D.Header({ children: [new D.Paragraph({
  alignment: D.AlignmentType.CENTER,
  border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
  children: [new D.TextRun({ text, font: F(SONG), size: SZ.wu })],
})] });
const emptyHeader = () => new D.Header({ children: [new D.Paragraph({ children: [] })] });
const footerP = () => new D.Footer({ children: [new D.Paragraph({
  alignment: D.AlignmentType.RIGHT,
  children: [new D.TextRun({ children: [D.PageNumber.CURRENT], font: F(SONG), size: SZ.wu })],
})] });
const emptyFooter = () => new D.Footer({ children: [new D.Paragraph({ children: [] })] });

// ---------- 封面、英文封面、承诺书 ----------
function center(text, font, size, opts = {}) {
  return new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: opts.spacing ?? { line: 400, lineRule: EXACT }, children: runs(text, { font, size, bold: opts.bold }) });
}
function blank(n = 1, line = 400) { return Array.from({ length: n }, () => new D.Paragraph({ spacing: { line, lineRule: EXACT }, children: [] })); }

function coverPages() {
  const m = meta;
  const infoRow = (label, value) => new D.Paragraph({
    indent: { left: cm(3.2) }, spacing: { line: 500, lineRule: EXACT },
    children: [...runs(label, { font: F(SONG), size: SZ.san }), ...runs(value, { font: F(SONG), size: SZ.san })],
  });
  const big = { line: Math.round(SZ.yi * 10 * 1.2 * 1.2), lineRule: EXACT };
  return [
    new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: TEXT_W }], children: [...runs(`中图分类号：${m.clc}`, { size: SZ.wu }), new D.TextRun({ children: [new D.Tab()] }), ...runs(`论文编号：${m.thesis_no}`, { size: SZ.wu })] }),
    new D.Paragraph({ children: runs(`学科分类号：${m.subject_code}`, { size: SZ.wu }) }),
    ...blank(3),
    center(m.degree_title, F(SONG), SZ.chu, { spacing: { line: 1100, lineRule: EXACT } }),
    ...blank(3),
    ...m.title_lines.map((l) => center(l, F(HEI), SZ.yi, { spacing: big })),
    ...blank(5),
    infoRow('研究生姓名　', m.author),
    infoRow(`${m.major_label}　`, m.major),
    infoRow('研究方向　　', m.direction),
    infoRow('指导教师　　', `${m.advisor}　${m.advisor_title}`),
    ...blank(5),
    center('南京航空航天大学', F(KAI), SZ.er, { spacing: { line: 700, lineRule: EXACT } }),
    center(`研究生院　${m.college}`, F(KAI), SZ.xiaoer, { spacing: { line: 600, lineRule: EXACT } }),
    center(m.date_cn, F(KAI), SZ.san, { spacing: { line: 600, lineRule: EXACT } }),
  ];
}

function englishCover() {
  const m = meta; const e = (t, size, opts = {}) => center(t, F(TNR), size, { bold: opts.bold, spacing: { line: opts.line ?? 480, lineRule: EXACT } });
  return [
    new D.Paragraph({ children: [new D.PageBreak()] }),
    e('Nanjing University of Aeronautics and Astronautics', SZ.san, { bold: true }),
    e('The Graduate School', SZ.xiaosan),
    e(m.college_en, SZ.xiaosan),
    ...blank(4),
    ...m.title_en_lines.map((l) => e(l, SZ.er, { bold: true, line: Math.round(SZ.er * 10 * 1.2 * 1.2) })),
    ...blank(4),
    e('A Thesis in', SZ.san), e(m.major_en, SZ.san), ...blank(1),
    e('by', SZ.san), e(m.author_en, SZ.san), ...blank(1),
    e('Advised by', SZ.san), e(m.advisor_en, SZ.san), ...blank(3),
    e('Submitted in Partial Fulfillment', SZ.san), e('of the Requirements', SZ.san), e('for the Degree of', SZ.san), e(m.degree_en, SZ.san),
    ...blank(2), e(m.date_en, SZ.san),
  ];
}

function promisePage() {
  const p = (t) => new D.Paragraph({ style: 'Body', spacing: { line: 480, lineRule: EXACT }, children: runs(t, { size: SZ.xiaosi }) });
  return [
    new D.Paragraph({ children: [new D.PageBreak()] }),
    new D.Paragraph({ style: 'FrontTitle', children: runs('承诺书') }),
    p('本人声明所呈交的硕士学位论文是本人在导师指导下进行的研究工作及取得的研究成果。除了文中特别加以标注和致谢的地方外，论文中不包含其他人已经发表或撰写过的研究成果，也不包含为获得南京航空航天大学或其他教育机构的学位或证书而使用过的材料。'),
    p('本人授权南京航空航天大学可以将学位论文的全部或部分内容编入有关数据库进行检索，可以采用影印、缩印或扫描等复制手段保存、汇编学位论文。'),
    p('（保密的学位论文在解密后适用本承诺书）'),
    ...blank(4),
    new D.Paragraph({ alignment: D.AlignmentType.RIGHT, indent: { right: cm(2) }, spacing: { line: 600, lineRule: EXACT }, children: runs('作者签名：　　　　　　　　', { size: SZ.xiaosi }) }),
    new D.Paragraph({ alignment: D.AlignmentType.RIGHT, indent: { right: cm(2) }, spacing: { line: 600, lineRule: EXACT }, children: runs('日　　期：　　　　　　　　', { size: SZ.xiaosi }) }),
  ];
}

// ---------- 主流程 ----------
const front = meta.frontmatter.map((n) => loadFile(n, { frontTitle: true }));
const chapters = meta.chapters.map((n) => loadFile(n, {}));
const back = meta.backmatter.map((n) => loadFile(n, {}));

// 先渲染正文以确定引用编号与图表清单
const chapterChildren = chapters.flatMap((c) => { currentFile = meta.chapters[chapters.indexOf(c)]; return renderBlocks(c.blocks, c.dir); });

const refList = [heading(1, '参考文献')];
cite.order.forEach((k, idx) => {
  const r = refsDb[k];
  const text = r ? r.text : `〔待补文献条目：${k}〕`;
  const warn = !r || (r.status && r.status !== 'ok');
  refList.push(new D.Paragraph({ style: 'RefItem', children: [new D.TextRun({ text: `[${idx + 1}] ` }), new D.TextRun({ text, ...(warn ? { highlight: 'yellow' } : {}) })] }));
});

const backChildren = back.flatMap((c, i) => { currentFile = meta.backmatter[i]; return renderBlocks(c.blocks, c.dir); });

// 前置部分：摘要、ABSTRACT（由源文件给出），目录、图表清单占位，注释表
const frontChildren = [];
front.forEach((c, i) => {
  currentFile = meta.frontmatter[i];
  if (meta.frontmatter[i] === 'symbols.md') {
    frontChildren.push(new D.Paragraph({ style: 'FrontTitle', pageBreakBefore: true, children: runs('目　　录') }), noIndent([new D.TextRun('%%TOC%%')]));
    frontChildren.push(new D.Paragraph({ style: 'FrontTitle', pageBreakBefore: true, children: runs('图表清单') }), noIndent([new D.TextRun('%%LOF%%')]), noIndent([new D.TextRun('%%LOT%%')]));
  }
  for (const b of c.blocks) {
    if (b.type === 'h' && b.level === 1) {
      const isEn = /^[A-Z ]+$/.test(b.text);
      frontChildren.push(new D.Paragraph({ style: isEn ? 'FrontTitleEn' : 'FrontTitle', pageBreakBefore: true, children: runs(b.text) }));
    } else if (b.type === 'p' && /^(关键词|Key ?words)[：:]/i.test(b.text)) {
      const [, label, rest] = b.text.match(/^((?:关键词|Key ?words)[：:])\s*(.*)$/i);
      frontChildren.push(noIndent([...runs(label, { bold: true, font: /^Key/i.test(label) ? F(TNR) : F(HEI) }), ...runs(rest)], { spacing: { before: 400, line: 400, lineRule: EXACT } }));
    } else frontChildren.push(...renderBlocks([b], c.dir));
  }
});

const doc = new D.Document({
  creator: meta.author, title: meta.title, description: '按南航研究生学位论文撰写要求排版的工作稿',
  evenAndOddHeaderAndFooters: true,
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: F(SONG), size: SZ.wu }, paragraph: { spacing: { ...LINE, before: 0, after: 0 } } },
      heading1: { run: { font: F(HEI), size: SZ.xiaosan, bold: false, color: '000000' }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: ONE_HALF_LINE, after: ONE_HALF_LINE, ...LINE }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      heading2: { run: { font: F(HEI), size: SZ.si, bold: false, color: '000000' }, paragraph: { spacing: { before: HALF_LINE, after: HALF_LINE, ...LINE }, keepNext: true, keepLines: true, outlineLevel: 1 } },
      heading3: { run: { font: F(HEI), size: SZ.xiaosi, bold: false, color: '000000' }, paragraph: { spacing: { before: HALF_LINE, after: HALF_LINE, ...LINE }, keepNext: true, keepLines: true, outlineLevel: 2 } },
      heading4: { run: { font: F(HEI), size: SZ.xiaosi, bold: false, italics: false, color: '000000' }, paragraph: { spacing: { before: HALF_LINE, after: HALF_LINE, ...LINE }, keepNext: true, keepLines: true, outlineLevel: 3 } },
    },
    paragraphStyles: [
      { id: 'Body', name: '论文正文', basedOn: 'Normal', quickFormat: true, run: { font: F(SONG), size: SZ.wu }, paragraph: { alignment: D.AlignmentType.JUSTIFIED, indent: { firstLine: 420 }, spacing: { ...LINE } } },
      { id: 'BodyNoIndent', name: '论文正文无缩进', basedOn: 'Body', paragraph: { indent: { firstLine: 0 } } },
      { id: 'FrontTitle', name: '前置部分标题', basedOn: 'Normal', run: { font: F(HEI), size: SZ.xiaosan }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: ONE_HALF_LINE, after: ONE_HALF_LINE, ...LINE }, keepNext: true } },
      { id: 'FrontTitleEn', name: '英文摘要标题', basedOn: 'FrontTitle', run: { font: F(TNR, TNR), size: SZ.si, bold: true } },
      { id: 'FigCaption', name: '图题', basedOn: 'Normal', run: { font: F(SONG), size: SZ.wu }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: 60, after: 200, ...LINE }, keepLines: true } },
      { id: 'TabCaption', name: '表题', basedOn: 'Normal', run: { font: F(SONG), size: SZ.wu }, paragraph: { alignment: D.AlignmentType.CENTER, spacing: { before: 200, after: 60, ...LINE }, keepNext: true, keepLines: true } },
      { id: 'TabCaptionPlain', name: '表题（不编号）', basedOn: 'TabCaption' },
      { id: 'TableText', name: '表格文字', basedOn: 'Normal', run: { font: F(SONG), size: SZ.wu }, paragraph: { spacing: { line: 340, lineRule: EXACT } } },
      { id: 'Note', name: '图表注', basedOn: 'Normal', run: { font: F(KAI), size: SZ.wu }, paragraph: { spacing: { before: 60, after: 120, ...LINE }, alignment: D.AlignmentType.JUSTIFIED } },
      { id: 'RefItem', name: '参考文献条目', basedOn: 'Normal', run: { font: F(SONG), size: SZ.wu }, paragraph: { alignment: D.AlignmentType.JUSTIFIED, indent: { left: 525, hanging: 525 }, spacing: { ...LINE } } },
      ...[1, 2, 3].map((n) => ({ id: `TOC${n}`, name: `toc ${n}`, basedOn: 'Normal', next: 'Normal', run: { font: F(n === 1 ? HEI : SONG), size: SZ.wu }, paragraph: { indent: { left: (n - 1) * 420 }, spacing: { ...LINE }, tabStops: [{ type: D.TabStopType.RIGHT, position: TEXT_W, leader: 'dot' }] } })),
    ],
  },
  sections: [
    {
      properties: { page: { size: PAGE, margin: MARGIN } },
      headers: { default: emptyHeader(), even: emptyHeader() }, footers: { default: emptyFooter(), even: emptyFooter() },
      children: [...coverPages(), ...englishCover(), ...promisePage()],
    },
    {
      properties: { type: D.SectionType.NEXT_PAGE, page: { size: PAGE, margin: MARGIN, pageNumbers: { start: 1, formatType: D.NumberFormat.LOWER_ROMAN } } },
      headers: { default: headerP(HEADER_ODD), even: headerP(meta.title) }, footers: { default: footerP(), even: footerP() },
      children: frontChildren,
    },
    {
      properties: { type: D.SectionType.NEXT_PAGE, page: { size: PAGE, margin: MARGIN, pageNumbers: { start: 1, formatType: D.NumberFormat.DECIMAL } } },
      headers: { default: headerP(HEADER_ODD), even: headerP(meta.title) }, footers: { default: footerP(), even: footerP() },
      children: [...chapterChildren, ...refList, ...backChildren],
    },
  ],
});

// ---------- 目录与图表清单域（带预填条目，Word 打开时提示更新域即得页码） ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (s) => s.replace(/\*\*/g, '').replace(/\[@[^\]]+\]/g, '').replace(/`/g, '');
function fieldXml(instr, entries) {
  const para = (style, inner) => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${inner}</w:p>`;
  const entry = (e) => `<w:r><w:t xml:space="preserve">${esc(e.text)}</w:t></w:r><w:r><w:tab/></w:r>`;
  const begin = `<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> ${esc(instr)} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>`;
  const end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
  if (!entries.length) return para('TOC1', begin + '<w:r><w:t>（暂无条目）</w:t></w:r>' + end);
  return entries.map((e, i) => para(`TOC${e.level}`, (i === 0 ? begin : '') + entry(e) + (i === entries.length - 1 ? end : ''))).join('');
}
const tocEntries = [];
for (const c of chapters) for (const b of c.blocks) if (b.type === 'h' && b.level <= 3) tocEntries.push({ level: b.level, text: plain(b.text) });
tocEntries.push({ level: 1, text: '参考文献' });
for (const c of back) for (const b of c.blocks) if (b.type === 'h' && b.level <= 3) tocEntries.push({ level: b.level, text: plain(b.text) });

const buf = await D.Packer.toBuffer(doc);
const zip = await JSZip.loadAsync(buf);
let xml = await zip.file('word/document.xml').async('string');
const replacePara = (marker, replacement) => {
  const re = new RegExp(`<w:p>(?:(?!<w:p>)[\\s\\S])*?${marker}[\\s\\S]*?</w:p>`);
  if (!re.test(xml)) throw new Error(`未找到占位 ${marker}`);
  xml = xml.replace(re, replacement);
};
replacePara('%%TOC%%', fieldXml('TOC \\o "1-3" \\h \\z \\u', tocEntries));
replacePara('%%LOF%%', fieldXml('TOC \\h \\z \\t "图题,1"', stats.figures.map((t) => ({ level: 1, text: plain(t) }))));
replacePara('%%LOT%%', fieldXml('TOC \\h \\z \\t "表题,1"', stats.tables.map((t) => ({ level: 1, text: plain(t) }))));
zip.file('word/document.xml', xml);
// 只拷贝文件项重新打包：去掉 ZIP 目录项（经云端协同打开时 Word 可能拒收带目录项的文件）
const clean = new JSZip();
for (const [name, f] of Object.entries(zip.files)) if (!f.dir) clean.file(name, await f.async('nodebuffer'), { createFolders: false });
const outBuf = await clean.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(OUT, outBuf);

// ---------- 构建报告 ----------
const all = [...meta.frontmatter, ...meta.chapters, ...meta.backmatter];
const total = all.reduce((a, n) => a + (stats.chars[n] || 0), 0);
const lines = [
  '# 构建报告（自动生成，勿手改）', '',
  `源文件提交后运行 \`npm run build\` 重新生成。汉字计数不含编辑备注与表格外的英文。`, '',
  '| 源文件 | 汉字数 | 待补标记〔〕 |', '|---|---:|---:|',
  ...all.map((n) => `| ${n} | ${stats.chars[n] || 0} | ${stats.placeholders[n] || 0} |`),
  `| 合计 | ${total} | ${Object.values(stats.placeholders).reduce((a, b) => a + b, 0)} |`, '',
  `引用文献 ${cite.order.length} 条；缺条目：${[...stats.missingRefs].join('、') || '无'}；待核：${cite.order.filter((k) => refsDb[k] && refsDb[k].status !== 'ok').join('、') || '无'}。`, '',
  `图 ${stats.figures.length} 幅：${stats.figures.join('；') || '无'}`, '',
  `表 ${stats.tables.length} 张：${stats.tables.join('；') || '无'}`, '',
];
fs.writeFileSync(REPORT, lines.join('\n'));
console.log(`已生成 ${path.relative(process.cwd(), OUT)}：汉字约 ${total}，引用 ${cite.order.length} 条，图 ${stats.figures.length}、表 ${stats.tables.length}`);
