// 把 render_blueprint.py 生成的 HTML 导出为 PDF 和 JPG。
// 用法：node export_blueprint.mjs <blueprint.html> [输出目录]
// 依赖工作台已安装的 playwright-core 和本机 Chrome（prototypes/drone-configurator 下先 npm ci）。
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../prototypes/drone-configurator/package.json'));
const { chromium } = require('playwright-core');
const html = path.resolve(process.argv[2] || 'blueprint.html');
const out = path.resolve(process.argv[3] || here);

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
const probe = await browser.newPage();
await probe.goto(pathToFileURL(html).href);
const size = await probe.evaluate(() => ({ width: document.body.offsetWidth, height: document.body.offsetHeight }));
await probe.close();
// 视口一开始就设成整页大小，截图时不再拼接。
const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(html).href);
const check = await page.evaluate(() => ({ overflow: window.overflow, tables: window.tables }));
await page.screenshot({ path: path.join(out, 'research-blueprint.jpg'), type: 'jpeg', quality: 86 });
await page.pdf({ path: path.join(out, 'research-blueprint.pdf'), width: size.width + 'px', height: size.height + 'px', printBackground: true, pageRanges: '1' });
await browser.close();
console.log(JSON.stringify({ size, ...check }));
