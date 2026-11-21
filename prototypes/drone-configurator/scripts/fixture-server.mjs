// 界面走查用的本机服务：证据检索照常使用公开卡；图像作业由软件夹具应答，不调用任何模型。
// 夹具把本轮的布局条件图原样作为「回图」返回，只用来检查画布上的提交、回图、取舍和继续生成是否连得上。
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';

const { values } = parseArgs({ options: { port: { type: 'string' }, delay: { type: 'string' }, 'image-backend': { type: 'string' } } });
const port = Number(values.port ?? 4178), delay = Number(values.delay ?? 1200);
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
// --image-backend qwen-comfy：夹具改按 ComfyUI 的接口应答（上传、入队、历史、取图），同样把布局条件图原样返回；
// 不带图的自由提示返回一张固定的示意图。回图里嵌入本轮的执行图，和 ComfyUI 存下的原图一样。
const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
const historyOf = (id, graph) => ({ [id]: { prompt: [1, id, graph, { client_id: 'fixture' }, ['12']],
  outputs: { 12: { images: [{ filename: graph['12'].inputs.filename_prefix + '_00001_.png', subfolder: '', type: 'output' }] } },
  status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: Date.now() - 20 }], ['execution_success', { prompt_id: id, timestamp: Date.now() }]] } } });
const uploads = new Map(), runs = new Map(); let lastGuide = null;
const comfyFixture = async (url, init = {}) => {
  const { pathname, searchParams } = new URL(url);
  if (pathname === '/upload/image') { const file = init.body.get('image'); const bytes = Buffer.from(await file.arrayBuffer()); uploads.set(file.name, bytes); lastGuide ??= bytes; return Response.json({ name: file.name, subfolder: '', type: 'input' }); }
  if (pathname === '/prompt') { const graph = JSON.parse(init.body).prompt; lastGuide = tagPNG(graph['15'] ? uploads.get(graph['15'].inputs.image) : plain, graph); await new Promise(resolve => setTimeout(resolve, delay)); runs.set('fixture-' + graph['10'].inputs.seed, graph); return Response.json({ prompt_id: 'fixture-' + graph['10'].inputs.seed, node_errors: {} }); }
  if (pathname.startsWith('/history/')) { const id = decodeURIComponent(pathname.slice(9)); return Response.json(historyOf(id, runs.get(id))); }
  if (pathname === '/view' && searchParams.get('type') === 'output') return new Response(lastGuide, { headers: { 'Content-Type': 'image/png' } });
  return new Response('not found', { status: 404 });
};
const jobs = values['image-backend'] === 'qwen-comfy'
  ? createImageJobs({ backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 50 }, fetchImpl: comfyFixture, directory: await mkdtemp(join(tmpdir(), 'workbench-fixture-')) })
  : createImageJobs({ apiKey: 'fixture', directory: await mkdtemp(join(tmpdir(), 'workbench-fixture-')),
  fetchImpl: async (_url, init) => {
    const body = JSON.parse(init.body);
    await new Promise(resolve => setTimeout(resolve, delay));
    return Response.json({ data: [{ b64_json: body.images[0].image_url.split(',')[1] }] }, { headers: { 'trace-id': 'software-fixture' } });
  } });
createDesignServer(chat, evidence, jobs).listen(port, '127.0.0.1', () =>
  console.log(`界面走查服务（软件夹具，不调用模型） http://127.0.0.1:${port}/ · 冒充的后端：${jobs.describe().label}`));
