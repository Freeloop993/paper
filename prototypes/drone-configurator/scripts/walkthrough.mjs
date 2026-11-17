// 可重复的走查：用无界面 Chrome 打开离线构建（file://），按真实的鼠标点击和键盘输入走完一遍流程，
// 每一步保存浏览器实际下载的三件导出、当时的屏幕读数（screen.json）和截图。
// 运行：npm run walkthrough（先执行 npm run build；需要本机装有 Google Chrome，Node 22 以上）。
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(resolve(here, '../dist/index.html')).href;
const out = resolve(process.argv[2] ?? join(here, '../review/20261118-round2'));
const exportsDir = join(out, 'exports'), shots = join(out, 'screenshots');
rmSync(exportsDir, { recursive: true, force: true }); rmSync(shots, { recursive: true, force: true });
mkdirSync(exportsDir, { recursive: true }); mkdirSync(shots, { recursive: true });

// 取当前屏幕上的读数：顶视图里的轴心与机臂线宽、四个比例、提示词逐句、意图与依据。
const readScreen = `(() => {
  const q = s => document.querySelector(s);
  const all = s => [...document.querySelectorAll(s)];
  return {
    layout: q('#drone-configurator-app').dataset.layout,
    viewport: [innerWidth, innerHeight],
    frame: q('[data-field="frame.frame_type"] [data-value]')?.innerText ?? null,
    hubs: all('[data-testid=preview] [data-layer=hub]').map(g => { const c = g.querySelector('circle'); return { id: g.dataset.hub, x_mm: +c.getAttribute('cx'), y_mm: -(+c.getAttribute('cy')) }; }),
    arm_stroke_width_mm: all('[data-testid=preview] [data-layer=arms] line').map(l => +l.getAttribute('stroke-width')),
    ghost_hubs: all('[data-testid=preview] [data-layer=ghost] circle').length,
    ratios: Object.fromEntries(all('[data-testid=ratios] [data-stat]').map(e => [e.dataset.stat, e.innerText.split('\\n').pop()])),
    sentences: all('[data-testid=sentences] [data-sentence]').map(e => ({ id: e.dataset.sentence, fresh: e.dataset.fresh, text: (e.querySelector('p') ?? e).innerText })),
    free_items: q('[data-testid=free-items]')?.innerText ?? null,
    intent_targets: all('[data-testid=intent] [role=radio][aria-checked=true]').map(e => e.innerText),
    intent_note: q('[data-testid=intent-note]')?.value ?? '',
    adopted: all('[data-testid=intent] [data-adopted]').map(e => e.dataset.adopted),
    last_change: q('[data-testid=last-change]')?.innerText.replace(/\\s+/g, ' ') ?? null,
    compare_line: q('[data-testid=compare-line]')?.innerText.replace(/\\s+/g, ' ') ?? null,
    notice: q('[data-testid=notice]')?.innerText ?? null,
  };
})()`;

const b = await launch();
const log = [];
try {
  const p = await b.open(page, { width: 1440, height: 900 });
  const shot = (name, opts) => p.screenshot(join(shots, name), opts);
  const top = () => p.evaluate(`window.scrollTo(0, 0)`);

  /** 记录屏幕读数，再点「导出三件」，等浏览器把三个文件真正写到磁盘。 */
  async function exportStep(step, note) {
    const dir = join(exportsDir, step);
    mkdirSync(dir, { recursive: true });
    await p.click('[data-testid=preview] [data-view=top]');
    const screen = await p.evaluate(readScreen);
    writeFileSync(join(dir, 'screen.json'), JSON.stringify({ step, note, captured_at: new Date().toISOString(), ...screen }, null, 2) + '\n');
    await p.setDownloadDir(dir);
    await p.click('[data-testid=export-all]');
    for (let i = 0; i < 60; i++) {
      const files = readdirSync(dir).filter(f => /^drone-(config|prompt|guide)-/.test(f) && !f.endsWith('.crdownload'));
      if (files.length >= 3) break;
      await p.sleep(150);
    }
    const files = readdirSync(dir).filter(f => f.startsWith('drone-')).sort();
    if (files.length !== 3) throw new Error(`${step}: 期望下载 3 个文件，实际 ${files.length}`);
    log.push({ step, note, files, wl: screen.ratios.wl, hubs: screen.hubs.length, arms: screen.arm_stroke_width_mm[0], fresh: screen.sentences.filter(s => s.fresh === 'yes').map(s => s.id) });
    console.log(`${step}  ${note}  →  ${files.length} 个文件；W/L ${screen.ratios.wl}；改动句 ${log.at(-1).fresh.join(',') || '无'}`);
    await top();
  }

  await shot('desktop-01-start.png');
  await shot('desktop-01-start-full-page.png', { fullPage: true });

  // 一、从评论依据提出设计意图：查看 → 采纳 → 取消 → 再采纳
  await p.click('[data-testid=evidence-open]');
  await p.type('[data-testid=evidence-search]', '小巧');
  const view = await p.evaluate(`({ count: document.querySelector('[data-testid=evidence-count]').innerText, cards: [...document.querySelectorAll('[data-card]')].map(c => c.dataset.card), text: document.querySelector('[data-card]').innerText })`);
  const before = await p.evaluate(readScreen);
  await p.click('[data-card=E001] [data-action=adopt]');
  const adopted = await p.evaluate(readScreen);
  await shot('desktop-02-evidence-adopted.png');
  await p.click('[data-card=E001] [data-action=undo]');
  const undone = await p.evaluate(readScreen);
  await p.click('[data-card=E001] [data-action=adopt]');
  await p.click('[data-testid=evidence-close]');
  await p.click('[data-target="compact:left"]');
  const same = (a, b) => JSON.stringify([a.hubs, a.ratios, a.arm_stroke_width_mm, a.sentences.map(s => s.text)]) === JSON.stringify([b.hubs, b.ratios, b.arm_stroke_width_mm, b.sentences.map(s => s.text)]);
  const evidenceCheck = {
    搜索小巧: view, 采纳后依据: adopted.adopted, 取消后依据: undone.adopted,
    采纳不改参数与提示词: same(before, adopted), 取消不改参数与提示词: same(before, undone),
  };
  await exportStep('01-true-x-goal-compact', '采纳 E001，提出「紧凑」，真 X');

  // 二、记为对比，切到宽 X，再切到 Deadcat
  await p.click('[data-testid=compare-toggle]');
  await p.click('[data-frame="Wide X"]');
  await top(); await shot('desktop-03-true-x-vs-wide-x.png');
  await exportStep('02-wide-x', '构型改为宽 X（与真 X 对比）');
  await p.click('[data-frame="Deadcat"]');
  await top(); await shot('desktop-04-deadcat.png');
  await p.click('[data-testid=preview] [data-view=guide]');
  await top(); await shot('desktop-05-deadcat-guide-image.png');
  await exportStep('03-deadcat', '构型改为 Deadcat');
  await p.click('[data-testid=compare-toggle]');

  // 三、只改机臂宽度：10 mm，再 20 mm
  await p.click('[data-field="frame.arm_width_mm"] [data-option="10mm"]');
  await exportStep('04-arm-10', '机臂宽度 10 mm');
  await p.click('[data-field="frame.arm_width_mm"] [data-option="20mm"]');
  await p.scrollTo('[data-testid=prompt-panel]');
  await shot('desktop-06-arm-20-prompt.png');
  await exportStep('05-arm-20', '机臂宽度 20 mm');

  // 四、指定几项造型：机身轮廓、主色、相机安装；看侧视
  await p.click('[data-tab=fuselage]');
  await p.click('[data-field="fuselage.fuselage_style"] [data-option="Aerodynamic Pod"]');
  await top(); await shot('desktop-07-fuselage-tab.png');
  await p.click('[data-tab=accessories]');
  await p.click('[data-colour="#f97316"]');
  await p.click('[data-field="accessories.camera_mount"] [data-option="underslung"]');
  await p.click('[data-testid=preview] [data-view=side]');
  await top(); await shot('desktop-08-accessories-side-view.png');
  await exportStep('06-styling-chosen', '指定流线舱、橙红、机鼻下挂相机');
  await p.scrollTo('[data-testid=prompt-panel]');
  await p.click('[data-testid=prompt-detail]');
  await p.scrollTo('[data-testid=prompt-panel]');
  await shot('desktop-09-prompt-sources-and-spec-card.png');
  await p.click('[data-testid=prompt-detail]');
  await top();

  // 五、最后取消证据卡（意图保留，改记为设计者判断）
  await p.click('[data-adopted=E001] button');
  await exportStep('07-card-undone-goal-kept', '取消采纳 E001，保留「紧凑」');

  // 六、搜不到依据时，自己写意图
  await p.click('[data-testid=reset]');
  await top();
  await p.click('[data-testid=evidence-open]');
  await p.type('[data-testid=evidence-search]', '防水');
  const empty = await p.evaluate(`({ count: document.querySelector('[data-testid=evidence-count]').innerText, empty: document.querySelector('[data-testid=evidence-empty]')?.innerText ?? null })`);
  await shot('desktop-10-no-matching-evidence.png');
  await p.click('[data-testid=evidence-close]');
  await p.type('[data-testid=intent-note]', '机身防泼溅，接缝少，机臂到机身的过渡连续。');
  await exportStep('08-no-match-own-intent', '无匹配依据，自写意图');
  await p.close();

  // 七、窄屏（手机）走几步
  const m = await b.open(page, { width: 390, height: 844, scale: 2, mobile: true });
  await m.screenshot(join(shots, 'narrow-01-start.png'));
  await m.click('[data-target="compact:left"]');
  await m.click('[data-frame="Deadcat"]');
  await m.click('[data-field="frame.arm_width_mm"] [data-option="20mm"]');
  await m.screenshot(join(shots, 'narrow-02-deadcat-arm-20.png'));
  await m.click('[data-testid=preview] [data-view=side]');
  await m.click('[data-tab=accessories]');
  await m.screenshot(join(shots, 'narrow-03-accessories-side-view.png'));
  await m.click('[data-testid=evidence-open]');
  await m.screenshot(join(shots, 'narrow-04-evidence.png'));
  await m.click('[data-testid=evidence-close]');
  await m.click('[data-testid=preview] [data-view=top]');
  await m.click('[data-tab=frame]');
  const narrow = await m.evaluate(readScreen);
  await m.screenshot(join(shots, 'narrow-05-full-page.png'), { fullPage: true });
  const errors = [...p.errors(), ...m.errors()].length;
  const remote = [...p.requests(), ...m.requests()].filter(u => !/^(file|data|blob):|^about:blank$/.test(u));
  await m.close();

  const summary = { 页面: page.replace(/^.*\/prototypes\//, 'prototypes/'), 步骤: log, 评论依据: evidenceCheck, 无匹配: empty,
    窄屏: { layout: narrow.layout, viewport: narrow.viewport, frame: narrow.frame, wl: narrow.ratios.wl, hubs: narrow.hubs.length, arms: narrow.arm_stroke_width_mm[0], targets: narrow.intent_targets },
    控制台报错数: errors, 非本地请求: remote };
  writeFileSync(join(out, 'walkthrough.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`评论依据：采纳不改参数 ${evidenceCheck.采纳不改参数与提示词}，取消不改参数 ${evidenceCheck.取消不改参数与提示词}；无匹配 ${empty.count}`);
  console.log(`窄屏：${narrow.layout} ${narrow.viewport.join('×')}，${narrow.frame}，轴心 ${narrow.hubs.length} 个，臂宽 ${narrow.arm_stroke_width_mm[0]}`);
  console.log(`控制台报错 ${errors}，非本地请求 ${remote.length}`);
  if (errors || remote.length || !evidenceCheck.采纳不改参数与提示词 || !evidenceCheck.取消不改参数与提示词) process.exitCode = 1;
} finally {
  await b.quit();
}
