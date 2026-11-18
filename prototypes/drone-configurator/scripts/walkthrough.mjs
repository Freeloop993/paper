// 可重复的走查：用无界面 Chrome 打开离线构建（file://），按真实的鼠标点击、拖动和键盘输入走完“洞察 → 造型 → 交付”，
// 每一步保存浏览器实际下载的三件导出、当时的屏幕读数（screen.json）和截图。
// 运行：npm run walkthrough（先执行 npm run build；需要本机装有 Google Chrome，Node 22 以上）。
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(resolve(here, '../dist/index.html')).href;
const out = resolve(process.argv[2] ?? join(here, '../review/20261118-round3'));
const exportsDir = join(out, 'exports'), shots = join(out, 'screenshots');
rmSync(exportsDir, { recursive: true, force: true }); rmSync(shots, { recursive: true, force: true });
mkdirSync(exportsDir, { recursive: true }); mkdirSync(shots, { recursive: true });

// 造型页上的读数：轴心（目标值，不受过渡动画影响）、机臂线宽、四个比例、设计提示、当前方案。
const readStudio = `(() => {
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  return {
    layout: q('#drone-configurator-app').dataset.layout, viewport: [innerWidth, innerHeight],
    frame: q('[data-testid=studio]').dataset.frameName,
    variant: q('[data-variant][data-active=yes]')?.dataset.variant ?? null,
    variants: all('[data-variant]').map(e => e.dataset.variant),
    hubs: all('[data-testid=top-view] [data-layer=hub]').map(g => ({ id: g.dataset.hub, x_mm: +g.dataset.x, y_mm: +g.dataset.y })),
    arm_stroke_width_mm: +q('[data-testid=top-view] [data-layer=arms]').dataset.width,
    ghost: all('[data-testid=top-view] [data-layer=ghost] circle').length > 0,
    ratios: Object.fromEntries(all('[data-testid=ratios] [data-stat]').map(e => [e.dataset.stat, e.querySelector('[data-value]').innerText])),
    hints: all('[data-hint]').map(e => ({ id: e.dataset.hint, level: e.dataset.level, title: e.querySelector('span span').innerText })),
    last_change: q('[data-testid=last-change]')?.innerText.replace(/\\s+/g, ' ') ?? null,
  };
})()`;
// 交付页上的读数：提示词逐句、规格卡里的意图与依据、自由项。
const readHandoff = `(() => {
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const intent = q('[data-testid=spec-intent]').dataset;
  return {
    sentences: all('[data-testid=sentences] [data-sentence]').map(e => ({ id: e.dataset.sentence, fresh: e.dataset.fresh, text: (e.querySelector('p') ?? e).innerText })),
    intent_targets: intent.targets ? intent.targets.split('|') : [], adopted: intent.cards ? intent.cards.split('|') : [], intent_note: intent.note,
    free_items: q('[data-testid=free-items]').innerText, spec_variant: q('[data-testid=spec-variant]').innerText,
    guide_hubs: all('[data-testid=guide-card] [data-guide-hub]').map(c => ({ id: c.dataset.guideHub, x_px: +c.getAttribute('cx'), y_px: +c.getAttribute('cy') })),
  };
})()`;

const b = await launch();
const log = [];
try {
  const p = await b.open(page, { width: 1440, height: 900 });
  const shot = (name, opts) => p.screenshot(join(shots, name), opts);
  const go = step => p.click(`[data-step=${step}]`);

  /** 在造型页读屏，再到交付页读提示词并点「导出三件」，等浏览器把三个文件真正写到磁盘。 */
  async function exportStep(step, note) {
    const dir = join(exportsDir, step);
    mkdirSync(dir, { recursive: true });
    await go('studio');
    await p.click('[data-view=top]');
    await p.sleep(350);
    const studio = await p.evaluate(readStudio);
    await go('handoff');
    const handoff = await p.evaluate(readHandoff);
    writeFileSync(join(dir, 'screen.json'), JSON.stringify({ step, note, captured_at: new Date().toISOString(), ...studio, ...handoff }, null, 2) + '\n');
    await p.setDownloadDir(dir);
    await p.click('[data-testid=export-all]');
    for (let i = 0; i < 60; i++) {
      if (readdirSync(dir).filter(f => /^drone-(config|prompt|guide)-/.test(f) && !f.endsWith('.crdownload')).length >= 3) break;
      await p.sleep(150);
    }
    const files = readdirSync(dir).filter(f => f.startsWith('drone-')).sort();
    if (files.length !== 3) throw new Error(`${step}: 期望下载 3 个文件，实际 ${files.length}`);
    const fresh = handoff.sentences.filter(s => s.fresh === 'yes').map(s => s.id);
    log.push({ step, note, variant: studio.variant, files, frame: studio.frame, wl: studio.ratios.wl, hubs: studio.hubs.length, arm_mm: studio.arm_stroke_width_mm, fresh, warnings: studio.hints.filter(h => h.level === 'warn').map(h => h.title) });
    console.log(`${step}  ${note}  →  ${files.length} 个文件；${studio.frame} W/L ${studio.ratios.wl}；改动句 ${fresh.join(',') || '无'}`);
    return { studio, handoff };
  }

  // 一、洞察：看主题 → 搜评论 → 采纳、取消、再采纳 → 选「紧凑」
  await shot('desktop-01-insight.png');
  await p.type('[data-testid=evidence-search]', '小巧');
  const found = await p.evaluate(`({ count: document.querySelector('[data-testid=evidence-count]').innerText, cards: [...document.querySelectorAll('[data-card]')].map(c => c.dataset.card) })`);
  await p.click('[data-card=E001] [data-action=adopt]');
  const afterAdopt = await p.evaluate(`[...document.querySelectorAll('[data-testid=intent] [data-adopted]')].map(e => e.dataset.adopted)`);
  await p.click('[data-card=E001] [data-action=undo]');
  const afterUndo = await p.evaluate(`[...document.querySelectorAll('[data-testid=intent] [data-adopted]')].map(e => e.dataset.adopted)`);
  await p.click('[data-card=E001] [data-action=adopt]');
  await p.click('[data-target="compact:left"]');
  await shot('desktop-02-insight-brief.png');
  await p.click('[data-testid=to-studio]');
  await p.sleep(400);
  await shot('desktop-03-studio-true-x.png');
  const s1 = await exportStep('01-true-x-goal-compact', '采纳 E001，提出「紧凑」，方案 A 为真 X');

  // 二、复制为方案 B，改成宽 X，把方案 A 叠上来对比；再改 Deadcat
  await go('studio');
  await p.click('[data-testid=variant-add]');
  await p.click('[data-frame="Wide X"]');
  await p.click('[data-variant=A] [data-action=ghost]');
  await p.sleep(400);
  await shot('desktop-04-studio-wide-x-vs-variant-a.png');
  await exportStep('02-wide-x', '方案 B：构型改为宽 X（叠上方案 A 对比）');
  await go('studio');
  await p.click('[data-frame="Deadcat"]');
  await p.sleep(400);
  await shot('desktop-05-studio-deadcat.png');
  await p.click('[data-view=guide]');
  await shot('desktop-06-studio-guide-image.png');
  await exportStep('03-deadcat', '方案 B：构型改为 Deadcat');

  // 三、只改机臂宽度：10 mm，再 20 mm
  await go('studio');
  await p.click('[data-field="frame.arm_width_mm"] [data-option="10mm"]');
  await exportStep('04-arm-10', '方案 B：机臂宽度 10 mm');
  await go('studio');
  await p.click('[data-field="frame.arm_width_mm"] [data-option="20mm"]');
  const s5 = await exportStep('05-arm-20', '方案 B：机臂宽度 20 mm');
  await shot('desktop-07-handoff-arm-20.png');

  // 四、在画布上直接拖：回到宽 X，把右前轴心向外拖；再拖机身的宽度手柄
  await go('studio');
  await p.click('[data-frame="Wide X"]');
  const beforeDrag = await p.evaluate(readStudio);
  await p.drag('[data-handle=hub-R2]', 22, -10);
  const afterHub = await p.evaluate(readStudio);
  await p.click('[data-tab=fuselage]');
  await p.drag('[data-handle=body-width]', -14, 0);
  const afterBody = await p.evaluate(readStudio);
  await p.sleep(300);
  await shot('desktop-08-studio-dragged.png');
  const dragCheck = {
    拖轴心前: { wl: beforeDrag.ratios.wl, R2: beforeDrag.hubs[1] }, 拖轴心后: { wl: afterHub.ratios.wl, R2: afterHub.hubs[1], last_change: afterHub.last_change },
    拖机身宽度后: { 机身宽比轴距: afterBody.ratios.bw, 之前: afterHub.ratios.bw },
  };
  await exportStep('06-dragged-on-canvas', '方案 B：在画布上拖动轴心与机身宽度');

  // 五、指定几项造型：流线舱、橙红、机鼻下挂相机；看侧视
  await go('studio');
  await p.click('[data-tab=fuselage]');
  await p.click('[data-field="fuselage.fuselage_style"] [data-option="Aerodynamic Pod"]');
  await p.click('[data-tab=accessories]');
  await p.click('[data-colour="#f97316"]');
  await p.click('[data-field="accessories.camera_mount"] [data-option="underslung"]');
  await p.sleep(300);
  await shot('desktop-09-studio-styling.png');
  await p.click('[data-view=side]');
  await shot('desktop-10-studio-side-view.png');
  await exportStep('07-styling-chosen', '方案 B：指定流线舱、橙红、机鼻下挂相机');
  await p.click('[data-testid=prompt-detail]');
  await shot('desktop-11-handoff-sources.png');
  await p.click('[data-testid=prompt-detail]');

  // 六、套用一款真实机型的比例
  await go('studio');
  await p.click('[data-ref=mini3pro] [data-action=apply]');
  await p.sleep(400);
  await shot('desktop-12-studio-reference-aircraft.png');
  const ref = await exportStep('08-reference-mini-3-pro', '方案 B：套用 Mini 3 Pro 的横纵比、轴距与桨径');

  // 七、回到洞察，取消证据卡（意图保留，改记为设计者判断）
  await go('insight');
  await p.click('[data-adopted=E001] button');
  await exportStep('09-card-undone-goal-kept', '取消采纳 E001，保留「紧凑」');

  // 八、重置；搜不到依据时自己写意图
  await p.click('[data-testid=reset]');
  await go('insight');
  await p.type('[data-testid=evidence-search]', '防水');
  const empty = await p.evaluate(`({ count: document.querySelector('[data-testid=evidence-count]').innerText, empty: document.querySelector('[data-testid=evidence-empty]')?.innerText ?? null })`);
  await shot('desktop-13-insight-no-match.png');
  await p.type('[data-testid=intent-note]', '机身防泼溅，接缝少，机臂到机身的过渡连续。');
  await exportStep('10-no-match-own-intent', '无匹配依据，自写意图');
  const desktopErrors = p.errors().length, desktopRemote = p.requests().filter(u => !/^(file|data|blob):|^about:blank$/.test(u));
  await p.close();

  // 九、窄屏（手机模拟）
  const m = await b.open(page, { width: 390, height: 844, scale: 2, mobile: true });
  await m.screenshot(join(shots, 'narrow-01-insight.png'));
  await m.click('[data-target="compact:left"]');
  await m.click('[data-step=studio]');
  await m.click('[data-frame="Deadcat"]');
  await m.click('[data-field="frame.arm_width_mm"] [data-option="20mm"]');
  await m.evaluate('window.scrollTo(0, 0)');
  await m.sleep(400);
  await m.screenshot(join(shots, 'narrow-02-studio.png'));
  const narrow = await m.evaluate(readStudio);
  await m.click('[data-step=handoff]');
  await m.screenshot(join(shots, 'narrow-03-handoff.png'));
  await m.screenshot(join(shots, 'narrow-04-handoff-full-page.png'), { fullPage: true });
  const errors = desktopErrors + m.errors().length;
  const remote = [...desktopRemote, ...m.requests().filter(u => !/^(file|data|blob):|^about:blank$/.test(u))];
  await m.close();

  const summary = {
    页面: page.replace(/^.*\/prototypes\//, 'prototypes/'), 步骤: log,
    评论依据: { 搜索小巧: found, 采纳后依据: afterAdopt, 取消后依据: afterUndo },
    画布拖动: dragCheck, 套用真实机型: { frame: ref.studio.frame, ratios: ref.studio.ratios, hints: ref.studio.hints }, 无匹配: empty,
    首步设计提示: s1.studio.hints, 臂宽20的改动句: s5.handoff.sentences.filter(s => s.fresh === 'yes'),
    窄屏: { layout: narrow.layout, viewport: narrow.viewport, frame: narrow.frame, wl: narrow.ratios.wl, hubs: narrow.hubs.length, arm_mm: narrow.arm_stroke_width_mm },
    控制台报错数: errors, 非本地请求: remote,
  };
  writeFileSync(join(out, 'walkthrough.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`评论依据：采纳后 ${JSON.stringify(afterAdopt)}，取消后 ${JSON.stringify(afterUndo)}；无匹配 ${empty.count}`);
  console.log(`画布拖动：W/L ${beforeDrag.ratios.wl} → ${afterHub.ratios.wl}；机身宽÷轴距 ${afterHub.ratios.bw} → ${afterBody.ratios.bw}`);
  console.log(`套用 Mini 3 Pro：${ref.studio.frame}，W/L ${ref.studio.ratios.wl}，桨径÷轴距 ${ref.studio.ratios.dd}`);
  console.log(`窄屏：${narrow.layout} ${narrow.viewport.join('×')}，${narrow.frame}，轴心 ${narrow.hubs.length} 个，臂宽 ${narrow.arm_stroke_width_mm}`);
  console.log(`控制台报错 ${errors}，非本地请求 ${remote.length}`);
  if (errors || remote.length || afterUndo.length || afterAdopt[0] !== 'E001' || beforeDrag.ratios.wl === afterHub.ratios.wl) process.exitCode = 1;
} finally {
  await b.quit();
}
