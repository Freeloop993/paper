// 用无界面 Chrome 直接打开离线构建 dist/index.html（file://），按留存的导出配置还原状态并截图。
// 运行：node review/20261117-round1/make_screenshots.mjs（先执行 npm run build；需要本机装有 Google Chrome，Node 22 以上）。
// 地址栏参数：cfg=还原的配置，pin=对照配置，set=还原后照常改的一项，tab=页签，evidence=1 展开证据卡，q=搜索词。
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../../dist/index.html');
const out = join(here, 'screenshots');
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333;

const cfg = step => {
  const dir = join(here, 'exports', step);
  const file = readdirSync(dir).filter(f => /^drone-config-.*\.json$/.test(f)).sort().pop();
  return readFileSync(join(dir, file)).toString('base64url');
};
const url = params => pathToFileURL(dist).href + '#' + Object.entries(params)
  .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(x => `${k}=${encodeURIComponent(x)}`)).join('&');

const profile = mkdtempSync(join(tmpdir(), 'configurator-shots-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let version;
for (let i = 0; i < 50 && !version; i++) { await sleep(200); try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* 还没起来 */ } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map(), waiters = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) for (const w of [...waiters]) if (w.method === m.method && w.sessionId === m.sessionId) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m.params); }
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, m => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const once = (method, sessionId) => new Promise(resolve => waiters.push({ method, sessionId, resolve }));

async function shot(name, { width, height, scale = 1, mobile = false, fullPage = false }, params) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile }, sessionId);
  const loaded = once('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: url(params) }, sessionId);
  await loaded;
  await sleep(900);
  if (fullPage) {
    const { cssContentSize } = await send('Page.getLayoutMetrics', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height: Math.ceil(cssContentSize.height), deviceScaleFactor: scale, mobile }, sessionId);
    await sleep(500);
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(out, name), Buffer.from(data, 'base64'));
  await send('Target.closeTarget', { targetId });
  console.log(name);
}

const S01 = '01-true-x-goal-compact', S02 = '02-wide-x', S04 = '04-arm-10', S05 = '05-arm-20';
const desk = { width: 1440, height: 900 }, phone = { width: 390, height: 844, scale: 2, mobile: true };
try {
  await shot('desktop-01-evidence-adopted-true-x.png', desk, { cfg: cfg(S01), evidence: 1, q: '小巧' });
  await shot('desktop-02-true-x-to-wide-x.png', desk, { cfg: cfg(S01), pin: cfg(S01), set: 'frame.frame_type="Wide X"' });
  await shot('desktop-03-wide-x-to-deadcat.png', desk, { cfg: cfg(S02), pin: cfg(S01), set: 'frame.frame_type="Deadcat"' });
  await shot('desktop-04-arm-width-10-to-20.png', desk, { cfg: cfg(S04), pin: cfg(S04), set: 'frame.arm_width_mm="20mm"' });
  await shot('desktop-05-styling-chosen-camera-occluded.png', desk, { cfg: cfg(S05), tab: 'accessories',
    set: ['fuselage.fuselage_style="Aerodynamic Pod"', 'accessories.drone_primary_color="#f97316"', 'accessories.camera_mount="underslung"'] });
  await shot('desktop-06-no-matching-card.png', desk, { evidence: 1, q: '防水' });
  await shot('desktop-07-tall-1440x1500.png', { width: 1440, height: 1500 }, { cfg: cfg(S04), pin: cfg(S04), set: 'frame.arm_width_mm="20mm"' });
  await shot('narrow-01-arm-width-10-to-20.png', phone, { cfg: cfg(S04), set: 'frame.arm_width_mm="20mm"' });
  await shot('narrow-02-deadcat-accessories-tab.png', phone, { cfg: cfg(S02), tab: 'accessories', set: 'frame.frame_type="Deadcat"' });
  await shot('narrow-03-evidence-no-match.png', phone, { evidence: 1, q: '防水' });
  await shot('narrow-04-full-page.png', { ...phone, fullPage: true }, { cfg: cfg(S04), evidence: 1, set: 'frame.arm_width_mm="20mm"' });
} finally {
  ws.close(); chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true });
}
