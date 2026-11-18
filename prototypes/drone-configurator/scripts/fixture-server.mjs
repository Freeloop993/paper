// 界面走查用的本机服务：证据检索照常使用公开卡；图像作业由软件夹具应答，不调用任何模型。
// 夹具把本轮的布局条件图原样作为「回图」返回，只用来检查画布上的提交、回图、取舍和继续生成是否连得上。
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';

const { values } = parseArgs({ options: { port: { type: 'string' }, delay: { type: 'string' } } });
const port = Number(values.port ?? 4178), delay = Number(values.delay ?? 1200);
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ apiKey: 'fixture', directory: await mkdtemp(join(tmpdir(), 'workbench-fixture-')),
  fetchImpl: async (_url, init) => {
    const body = JSON.parse(init.body);
    await new Promise(resolve => setTimeout(resolve, delay));
    return Response.json({ data: [{ b64_json: body.images[0].image_url.split(',')[1] }] }, { headers: { 'trace-id': 'software-fixture' } });
  } });
createDesignServer(chat, evidence, jobs).listen(port, '127.0.0.1', () =>
  console.log(`界面走查服务（软件夹具，不调用模型） http://127.0.0.1:${port}/`));
