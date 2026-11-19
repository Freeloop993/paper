// 把厂商官方 3D 模型（.glb）渲染成正顶视图：同一机位、同一光照、同一画幅。
// 用法：node render.mjs [模型文件名…]   （默认渲染 models/ 下全部 .glb，输出到 renders/）
// 需要工作台目录已安装 playwright-core、本机 Chrome 和网络（加载 model-viewer 及其解码器）。
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const dir = path.join(here, 'models'), out = path.join(here, 'renders'); fs.mkdirSync(out, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter((f) => f.endsWith('.glb'));
const yaw = JSON.parse(fs.existsSync(path.join(here, 'yaw.json')) ? fs.readFileSync(path.join(here, 'yaw.json'), 'utf8') : '{}');
const page_html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}model-viewer{width:1024px;height:1024px;background:#fff;--poster-color:#fff}</style>
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
<model-viewer id="mv" environment-image="/env.hdr" exposure="0.9" shadow-intensity="0.55" shadow-softness="1" interaction-prompt="none"
  min-camera-orbit="auto 0deg auto" max-camera-orbit="auto 180deg auto" min-field-of-view="1deg" interpolation-decay="1"></model-viewer>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page_html); }
  const f = path.join(dir, path.basename(u));
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': u.endsWith('.hdr') ? 'image/vnd.radiance' : 'model/gltf-binary', 'access-control-allow-origin': '*' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.error('page:', m.text().slice(0, 160)); });
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => !!customElements.get('model-viewer'), null, { timeout: 60000 });
const log = {};
for (const name of names) {
  const theta = yaw[name] ?? 0;
  const info = await page.evaluate(async ({ name, theta }) => {
    const mv = document.getElementById('mv');
    await new Promise((ok, bad) => { const t = setTimeout(() => bad(new Error('timeout')), 120000); mv.addEventListener('load', () => { clearTimeout(t); ok(); }, { once: true }); mv.addEventListener('error', (e) => { clearTimeout(t); bad(new Error('load error')); }, { once: true }); mv.src = '/' + name; });
    const dim = mv.getDimensions(), fov = 8, dist = (Math.max(dim.x, dim.z) / 2) / Math.tan(fov * Math.PI / 360) * 1.18;      // 8 度视场，接近正投影；留 18% 边
    mv.maxCameraOrbit = 'auto 180deg ' + (dist * 2) + 'm'; mv.fieldOfView = fov + 'deg'; mv.cameraTarget = 'auto auto auto'; mv.cameraOrbit = theta + 'deg 0deg ' + dist + 'm'; mv.jumpCameraToGoal();
    await mv.updateComplete; for (let i = 0; i < 12; i++) await new Promise((r) => requestAnimationFrame(r));
    const d = mv.getDimensions(); return { x: d.x, y: d.y, z: d.z, anims: mv.availableAnimations, png: mv.toDataURL('image/png') };
  }, { name, theta }).catch((e) => ({ error: String(e) }));
  if (info.png) { fs.writeFileSync(path.join(out, name.replace('.glb', '.png')), Buffer.from(info.png.split(',')[1], 'base64')); delete info.png; }
  log[name] = info; console.log(name, JSON.stringify(info));
}
fs.writeFileSync(path.join(here, 'render-log.json'), JSON.stringify(log, null, 1) + '\n');
await browser.close(); server.close();
