import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { ChatError, createDesignChat } from './design-chat.mjs';
import { createImageJobs } from './image-jobs.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const limit = 64 * 1024;
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const fail = (status, code, message) => { throw new ChatError(status, code, message); };
const missing = () => fail(404, 'not_found', '找不到本机页面或资源。请确认已构建工作台。');

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readInput(req, maxBytes=limit) {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json')
    fail(415, 'json_required', '本机设计对话仅接收 JSON。');
  const tooLarge = () => fail(413, 'input_too_large', '本次输入过长，请缩短问题或减少历史消息。');
  if (Number(req.headers['content-length']) > maxBytes) tooLarge();
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBytes) { req.resume(); tooLarge(); }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail(400, 'invalid_json', '请求中的 JSON 无法解析。'); }
}

async function serveAsset(req, res, pathname) {
  if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'method_not_allowed', '此资源仅支持读取。');
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { missing(); }
  const segments = decoded.slice(1).split('/');
  if (/[\\:\x00-\x1f]/.test(decoded) || segments.some(segment => segment.startsWith('.'))) missing();
  const file = pathname === '/' ? path.join(dist, 'index.html') : path.resolve(dist, ...segments);
  const contentType = mime[path.extname(file).toLowerCase()];
  if (!contentType) missing();
  let asset, size;
  try {
    const realDist = await realpath(dist);
    asset = await realpath(file);
    const relative = path.relative(realDist, asset);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) missing();
    const info = await stat(asset);
    if (!info.isFile()) missing();
    size = info.size;
  } catch { missing(); }
  res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': size, 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') res.end();
  else await pipeline(createReadStream(asset), res);
}

export function createDesignServer(chat, imageJobs) {
  return createServer({ requestTimeout: 20000, headersTimeout: 10000, maxHeaderSize: 8192 }, async (req, res) => {
    try {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      const host = req.headers.host;
      const port = req.socket.localPort;
      const validHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (port === 80) validHosts.push('127.0.0.1', 'localhost');
      if (!validHosts.includes(host) || req.headers.origin !== undefined && req.headers.origin !== `http://${host}`)
        fail(403, 'foreign_origin', '请从本机工作台页面发起请求。');
      if (!req.url?.startsWith('/') || req.url.startsWith('//') || req.url.includes('\\')) missing();
      const pathname = new URL(req.url, `http://${host}`).pathname;
      if (pathname === '/api/design/chat') {
        if (req.method !== 'POST') fail(405, 'method_not_allowed', '设计对话仅支持 POST。');
        sendJson(res, 200, await chat(await readInput(req)));
      } else if (imageJobs && pathname==='/api/h3/jobs') {
        if (req.method!=='POST') fail(405,'method_not_allowed','图像生成仅支持 POST。');
        sendJson(res,202,await imageJobs.submit(await readInput(req,64*1024*1024)));
      } else if (imageJobs && pathname.startsWith('/api/h3/jobs/')) {
        if (req.method!=='GET') fail(405,'method_not_allowed','生成状态仅支持 GET。');
        sendJson(res,200,await imageJobs.get(pathname.slice('/api/h3/jobs/'.length)));
      } else {
        await serveAsset(req, res, pathname);
      }
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      if (error instanceof ChatError) {
        sendJson(res, error.status, { error: error.message, code: error.code, ...error.metadata });
      } else {
        sendJson(res, 500, { error: '本机设计对话服务未能处理本次请求。', code: 'local_error' });
      }
    }
  });
}

async function main() {
  const { values } = parseArgs({ options: { port: { type: 'string' } } });
  const port = Number(values.port ?? process.env.PORT ?? 4178);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须为 1 至 65535 的整数。');
  const chat = await createDesignChat({ apiKey: process.env.MINIMAX_API_KEY?.trim(), region: process.env.MINIMAX_REGION ?? 'cn' });
  const imageJobs=createImageJobs({apiKey:process.env.MINIMAX_IMAGE_API_KEY?.trim() || process.env.MINIMAX_API_KEY?.trim(),
    region:process.env.MINIMAX_IMAGE_REGION ?? process.env.MINIMAX_REGION ?? 'cn',directory:process.env.WORKBENCH_IMAGE_JOBS_DIR});
  const server = createDesignServer(chat,imageJobs);
  server.on('error', () => { console.error('本机设计对话服务启动失败，请核对端口。'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`本机多旋翼设计工作台 http://127.0.0.1:${port}/`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { console.error('本机设计对话服务启动失败，请检查端口、区域和本地证据卡。'); process.exitCode = 1; });
}
