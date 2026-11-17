// 离线包复核：解压 configurator-offline.zip，用无界面 Chrome 以 file:// 打开，
// 检查页面是否渲染、是否有报错、是否发出任何非本地请求，并实际点一次“宽 X 型”和“导出三件”。
// 运行：npm run check-offline（需要本机装有 Google Chrome 和 unzip，Node 22 以上）。
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const zip = resolve(here, '../configurator-offline.zip');
const work = mkdtempSync(join(tmpdir(), 'configurator-offline-'));
execFileSync('unzip', ['-q', zip, '-d', join(work, 'package')]);
const page = pathToFileURL(join(work, 'package', 'index.html')).href;
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9334;
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${join(work, 'profile')}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let version;
for (let i = 0; i < 50 && !version; i++) { await sleep(200); try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* 等待启动 */ } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map(), events = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); });
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pending.set(id, m => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id, method, params, sessionId })); });
let ok = true;
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  for (const d of ['Page', 'Network', 'Runtime', 'Log']) await send(d + '.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: page }, sessionId);
  await sleep(1500);
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
  const first = await evaluate(`({title: document.title, layout: document.querySelector('#drone-configurator-app')?.dataset.layout, hubs: document.querySelectorAll('[data-testid=preview] [data-layer=hub]').length, tabs: [...document.querySelectorAll('[role=tab]')].map(t => t.dataset.tab), wl: document.querySelector('[data-stat=wl]')?.innerText.split('\\n')[1], sentences: document.querySelectorAll('[data-testid=sentences] [data-sentence]').length, cards: ${'`${document.body.innerText.match(/(\\d+) 张公开证据卡/)?.[1]}`'}})`);
  const after = await evaluate(`(async () => {
    const names = [];
    HTMLAnchorElement.prototype.click = function () { names.push(this.download); };
    [...document.querySelectorAll('[role=radio]')].find(b => b.innerText.includes('宽 X 型')).click();
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-testid=export-all-header]').click();
    await new Promise(r => setTimeout(r, 300));
    return { wl: document.querySelector('[data-stat=wl]').innerText.split('\\n')[1], changed: [...document.querySelectorAll('[data-sentence][data-changed=yes]')].map(e => e.dataset.sentence), exported: names };
  })()`);
  const requests = events.filter(e => e.method === 'Network.requestWillBeSent').map(e => e.params.request.url);
  const remote = requests.filter(u => !u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:blank');
  const errors = events.filter(e => (e.method === 'Runtime.exceptionThrown') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
  const report = { 打开方式: 'file://（解压后的离线包）', 首屏: first, 点宽X并导出: after, 请求总数: requests.length, 非本地请求: remote, 报错数: errors.length };
  console.log(JSON.stringify(report, null, 2));
  ok = first.hubs === 4 && first.tabs.join() === 'frame,propulsion,fuselage,landing_gear,accessories' && first.wl === '1.00' && after.wl === '1.30'
    && after.changed.join() === 'layout' && after.exported.length === 3 && remote.length === 0 && errors.length === 0;
  console.log(ok ? '离线包复核通过' : '离线包复核未通过');
} finally {
  ws.close(); chrome.kill(); await sleep(300); rmSync(work, { recursive: true, force: true });
}
process.exit(ok ? 0 : 1);
