// 无界面 Chrome 的最小驱动（Chrome DevTools Protocol）。供走查、截图和离线包复核脚本共用。
// 需要本机装有 Google Chrome，Node 22 以上（自带 WebSocket）。
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch({ port = 9340 } = {}) {
  const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const profile = mkdtempSync(join(tmpdir(), 'configurator-chrome-'));
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 60 && !version; i++) { await sleep(200); try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* 等待启动 */ } }
  if (!version) throw new Error('Chrome 没有启动');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let seq = 0;
  const pending = new Map(), events = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m);
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, m => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  /** 打开一个页面。mobile=true 时按手机模拟（宽度、像素比、触摸）。 */
  async function open(url, { width = 1440, height = 900, scale = 1, mobile = false, downloadDir } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    for (const d of ['Page', 'Runtime', 'Network', 'Log']) await send(d + '.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile }, sessionId);
    if (downloadDir) await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir, eventsEnabled: true });
    await send('Page.navigate', { url }, sessionId);
    await sleep(1200);
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    /** 把元素滚到看得见、没被吸顶区块盖住的位置，返回它的中心点。 */
    const locate = async selector => {
      const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const centre = () => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
        let c = centre(); const hit = document.elementFromPoint(c.x, c.y);
        if (hit && !el.contains(hit) && !hit.contains(el)) { window.scrollBy(0, c.y - innerHeight * 0.8); c = centre(); }
        return c; })()`);
      if (!box) throw new Error('找不到元素：' + selector);
      await sleep(120);
      return box;
    };
    const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra }, sessionId);
    /** 在元素中心发出真实的鼠标按下与抬起。 */
    const click = async selector => {
      const box = await locate(selector);
      await mouse('mousePressed', box.x, box.y); await mouse('mouseReleased', box.x, box.y);
      await sleep(320);
    };
    /** 按住元素中心，拖动 dx、dy 个像素后松开（真实的鼠标事件）。 */
    const drag = async (selector, dx, dy, steps = 8) => {
      const box = await locate(selector);
      await mouse('mousePressed', box.x, box.y);
      for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', box.x + (dx * i) / steps, box.y + (dy * i) / steps); await sleep(30); }
      await mouse('mouseReleased', box.x + dx, box.y + dy);
      await sleep(420);
    };
    /** 向当前有焦点的输入框键入文字（先全选，覆盖原内容）。 */
    const type = async (selector, text) => {
      await click(selector);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).select?.()`);
      await send('Input.insertText', { text }, sessionId);
      await sleep(250);
    };
    const scrollTo = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'start' })`);
    const screenshot = async (file, { fullPage = false } = {}) => {
      if (fullPage) {
        const { cssContentSize } = await send('Page.getLayoutMetrics', {}, sessionId);
        await send('Emulation.setDeviceMetricsOverride', { width, height: Math.ceil(cssContentSize.height), deviceScaleFactor: scale, mobile }, sessionId);
        await sleep(400);
      }
      const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      writeFileSync(file, Buffer.from(data, 'base64'));
      if (fullPage) await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile }, sessionId);
    };
    const requests = () => events.filter(e => e.sessionId === sessionId && e.method === 'Network.requestWillBeSent').map(e => e.params.request.url);
    const errors = () => events.filter(e => e.sessionId === sessionId && (e.method === 'Runtime.exceptionThrown'
      || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')));
    /** 之后的下载都真实写入这个文件夹。 */
    const setDownloadDir = dir => send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true });
    const close = () => send('Target.closeTarget', { targetId });
    return { evaluate, click, drag, type, scrollTo, screenshot, setDownloadDir, requests, errors, close, sleep };
  }

  const quit = async () => { ws.close(); chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true }); };
  return { open, quit, sleep };
}
