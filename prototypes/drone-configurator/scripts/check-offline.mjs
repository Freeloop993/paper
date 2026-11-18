// 离线包复核：解压 configurator-offline.zip，用无界面 Chrome 以 file:// 打开，
// 检查三个环节能否打开、控制台报错和是否有非本地请求，并用真实点击切到“宽 X 型”、到交付页导出三件（真实下载）。
// 运行：npm run check-offline（需要本机装有 Google Chrome 和 unzip，Node 22 以上）。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'configurator-offline-'));
execFileSync('unzip', ['-q', resolve(here, '../configurator-offline.zip'), '-d', join(work, 'package')]);
const b = await launch({ port: 9341 });
let ok = false;
try {
  const p = await b.open(pathToFileURL(join(work, 'package', 'index.html')).href, { width: 1440, height: 900 });
  const steps = await p.evaluate(`[...document.querySelectorAll('[data-step]')].map(e => e.dataset.step)`);
  const insight = await p.evaluate(`({ title: document.title, cards: document.querySelectorAll('[data-card]').length, themes: document.querySelectorAll('[data-theme]').length })`);
  await p.click('[data-step=studio]');
  const read = () => p.evaluate(`({
    tabs: [...document.querySelectorAll('[role=tab][data-tab]')].map(t => t.dataset.tab),
    hubs: document.querySelectorAll('[data-testid=top-view] [data-layer=hub]').length,
    wl: document.querySelector('[data-testid=ratios] [data-stat=wl] [data-value]').innerText,
    hints: document.querySelectorAll('[data-hint]').length,
    aircraft: document.querySelectorAll('[data-ref]').length,
  })`);
  const first = await read();
  await p.click('[data-frame="Wide X"]');
  const after = await read();
  await p.click('[data-step=handoff]');
  const downloads = join(work, 'downloads');
  await p.setDownloadDir(downloads);
  await p.click('[data-testid=export-all]');
  await p.sleep(1500);
  const fresh = await p.evaluate(`[...document.querySelectorAll('[data-sentence][data-fresh=yes]')].map(e => e.dataset.sentence)`);
  const files = readdirSync(downloads).filter(f => f.startsWith('drone-')).sort();
  const remote = p.requests().filter(u => !/^(file|data|blob):|^about:blank$/.test(u));
  const errors = p.errors().length;
  console.log(JSON.stringify({ 打开方式: 'file://（解压后的离线包）', 流程: steps, 洞察页: insight, 造型页首屏: first, 点宽X后: after, 改动句: fresh, 实际下载: files, 非本地请求: remote, 控制台报错数: errors }, null, 2));
  ok = steps.join() === 'insight,studio,handoff' && insight.cards === 36 && first.hubs === 4 && first.tabs.join() === 'frame,propulsion,fuselage,landing_gear,accessories'
    && first.wl === '1.00' && after.wl === '1.30' && fresh.join() === 'layout' && files.length === 3 && remote.length === 0 && errors === 0;
  console.log(ok ? '离线包复核通过' : '离线包复核未通过');
} finally {
  await b.quit();
  rmSync(work, { recursive: true, force: true });
}
process.exit(ok ? 0 : 1);
