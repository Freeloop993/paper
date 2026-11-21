import { taskStores } from '../store/droneStore';
import { findAttempt, freezeAttempt, hashBlob, listAttempts, updateH3Record, type FrozenAttempt } from './candidateRecords';
import { computeLayout, frameRules, taskLabels, type Task } from './design';
import { compilePrompt } from './partPrompt';
import { suggestFields } from './semantics/brief';
import { backendOf, imageBackend, modelLabel } from './imageBackend';
import type { DesignIntent, DroneParameters } from '../types/DroneParameters';

const endpoint = '/api/h3/jobs';
const preparing = new Map<string, Promise<string>>();
const workers = new Map<string, Promise<void>>();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type ImageInput = {role: 'layout' | 'parent'; name: string; sha256: string; dataUrl: string};
interface H3Request { attemptId: string; prompt: string; inputs: ImageInput[]; condition?: 'free' }
interface H3Job {
  provider: string; model: string; jobId: string; attemptId: string;
  status?: 'queued' | 'running' | 'succeeded' | 'failed';
  inputHashes?: string[];
  outputs?: {name: string; mimeType: string; sha256: string; dataUrl: string}[];
  error?: string;
  evidence?: {
    request?: {model?: string; prompt?: string; n?: number; output_format?: string; endpoint?: string; condition?: string; images?: {role:string;sha256:string}[]};
    response?: {traceId?: string; outputHashes?: string[]; httpStatus?: number};
  };
}

class ServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {super(message); this.status = status;}
}
async function call(path: string, body?: Blob): Promise<{raw: Blob; job: H3Job}> {
  if (!['http:', 'https:'].includes(location.protocol)) throw new ServiceError(0,'请从本机工作台服务打开页面，离线文件可查看已保存的图像。');
  const response = await fetch(path, {method: body ? 'POST' : 'GET', body, cache: 'no-store', credentials:'omit', signal:AbortSignal.timeout(30000)});
  const raw = await response.blob();
  let job;
  try { job = JSON.parse(await raw.text()); }
  catch { throw new ServiceError(response.status,'当前页面未连接图像生成服务，请从本机工作台服务打开。'); }
  if (!response.ok) throw new ServiceError(response.status,typeof job?.error === 'string' ? job.error : 'H3 服务返回 HTTP ' + response.status);
  return {raw,job};
}

function dataUrl(file: Blob): Promise<string> {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
async function originalRequest(row: FrozenAttempt) {
  const input = async (role: ImageInput['role'], file: Blob) => {
    const sha256 = await hashBlob(file);
    return {role, name:role + '-' + sha256 + '.png', sha256, dataUrl:await dataUrl(file)};
  };
  // 自由提示不带布局条件图：发出去的只有设计者的原文，和他自己接上的那一张图（如果有）。
  const inputs = row.condition === 'free' ? [] : [await input('layout',row.guide)];
  if (row.parentImage) inputs.push(await input('parent',row.parentImage));
  return new Blob([JSON.stringify({attemptId:row.id,prompt:row.confirmedText,inputs,...(row.condition === 'free' ? {condition:'free'} : {})})],{type:'application/json'});
}

function verifyIdentity(row: FrozenAttempt, job: H3Job) {
  const backend = backendOf(row.h3?.model);
  if (!job || job.provider !== backend.provider || job.model !== backend.model || job.attemptId !== row.id || job.jobId !== row.id)
    throw new Error('回执中的模型或任务编号与本轮不符。本轮冻结时接的是 ' + backend.label + '。');
}
function decodePng(src: string) {
  if (typeof src !== 'string' || !src.startsWith('data:image/png;base64,')) throw new Error('H3 回图缺少 PNG 原件。');
  const bytes = Uint8Array.from(atob(src.slice('data:image/png;base64,'.length)), ch => ch.charCodeAt(0));
  if (![137,80,78,71,13,10,26,10].every((byte,index) => bytes[index] === byte)) throw new Error('H3 回图文件格式与 PNG 标记不符。');
  return new Blob([bytes], {type:'image/png'});
}
async function storeResult(row: FrozenAttempt, request: Blob, raw: Blob, job: H3Job) {
  verifyIdentity(row,job);
  const sent: H3Request = JSON.parse(await request.text());
  const free = row.condition === 'free';
  const originals = [...(free ? [] : [row.guide]), ...(row.parentImage ? [row.parentImage] : [])];
  if (sent.attemptId !== row.id || sent.prompt !== row.confirmedText || sent.inputs.length !== originals.length || (sent.condition === 'free') !== free ||
    !Array.isArray(job.inputHashes) || job.inputHashes.length !== originals.length)
    throw new Error('H3 回执的设计输入和本轮冻结记录不一致。');
  for (let index = 0; index < originals.length; index++) {
    const digest = await hashBlob(originals[index]), input = sent.inputs[index];
    if (input.role !== (!free && index === 0 ? 'layout' : 'parent') || input.sha256 !== digest ||
      job.inputHashes[index] !== digest || await hashBlob(decodePng(input.dataUrl)) !== digest)
      throw new Error('请求里的布局图或父图与本轮原件不一致。');
  }
  const traceId = job.evidence?.response?.traceId;
  const evidence = job.evidence?.request;
  const backend = backendOf(row.h3?.model);
  if (!evidence || evidence.model !== backend.model || evidence.prompt !== row.confirmedText || (evidence.condition === 'free') !== free ||
    evidence.n !== 1 || evidence.output_format !== 'png' || evidence.endpoint !== backend.endpoint ||
    !Array.isArray(evidence.images) || evidence.images.length !== sent.inputs.length ||
    sent.inputs.some((image,index) => evidence.images?.[index]?.role !== image.role || evidence.images[index].sha256 !== image.sha256))
    throw new Error('供应商请求记录中的文字、图片或模型与本轮不符。');
  if (job.status === 'failed') {
    await updateH3Record(row.id, {status:'failed', result:raw, traceId, issue:job.error || backend.label + ' 未完成本轮。'});
    return;
  }
  if (!job.evidence?.request || !job.evidence?.response || !Array.isArray(job.outputs) || job.outputs.length !== 1)
    throw new Error('H3 服务未返回本轮完整的供应商记录和一张效果图。');
  const item = job.outputs[0], file = decodePng(item.dataUrl);
  if (item.mimeType !== 'image/png' || !item.name || await hashBlob(file) !== item.sha256 ||
    job.evidence.response.outputHashes?.length !== 1 || job.evidence.response.outputHashes[0] !== item.sha256)
    throw new Error('H3 回图与服务记录的 PNG 摘要不一致。');
  const decoded = await createImageBitmap(file);
  decoded.close();
  await updateH3Record(row.id,{status:'succeeded',result:raw,traceId,issue:undefined},
    [{id:row.id+'/1', name:item.name, hash:item.sha256, file}]);
}

async function run(id: string) {
  const row = await findAttempt(id);
  if (!row?.h3 || row.h3.status === 'succeeded' || row.h3.status === 'failed') return;
  const path = endpoint + '/' + encodeURIComponent(id);
  try {
    const request = row.h3.request ?? await originalRequest(row);
    let needsPost = row.h3.status === 'ready';
    if (needsPost) await updateH3Record(id,{status:'submitting', request, issue:undefined});
    else if (row.h3.status === 'submitting') {
      try {
        const lookup = await call(path);
        verifyIdentity(row,lookup.job);
      } catch (error) {
        if (!(error instanceof ServiceError) || error.status !== 404) throw error;
        needsPost = true; // Retry the exact same body and durable idempotency key.
      }
    }
    if (needsPost) {
      let ack;
      try { ack = await call(endpoint,request); }
      catch (error) {
        // The service may have accepted the job before the response was lost.
        if (error instanceof ServiceError && error.status >= 400 && error.status < 500) throw error;
        try { const lookup = await call(path); verifyIdentity(row,lookup.job); }
        catch { throw error; }
      }
      if (ack) verifyIdentity(row,ack.job);
      await updateH3Record(id,{status:'running',acknowledgement:ack?.raw,issue:undefined});
    } else if (row.h3.status !== 'running' || row.h3.issue) {
      await updateH3Record(id,{status:'running',issue:undefined});
    }
    let interval = 1200;
    for (;;) {
      const {raw,job} = await call(path);
      verifyIdentity(row,job);
      if (job.status === 'succeeded' || job.status === 'failed') {
        await storeResult(row,request,raw,job);
        return;
      }
      if (job.status !== 'queued' && job.status !== 'running') throw new Error('H3 服务未返回可识别的任务状态。');
      await sleep(interval);
      interval = Math.min(5000,interval * 1.4);
      const current = await findAttempt(id);
      if (current?.h3?.status === 'succeeded' || current?.h3?.status === 'failed') return;
    }
  } catch (error) {
    const issue = error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')
      ? '无法连接图像生成服务。请检查本机工作台服务后恢复本轮。'
      : error instanceof Error ? error.message : String(error);
    await updateH3Record(id,{issue});
  }
}

function ensureRunning(id: string) {
  if (workers.has(id)) return;
  const task = run(id).catch(error => {
    window.dispatchEvent(new CustomEvent('generation-error', {detail:{id, message:String(error)}}));
  }).finally(() => {
    workers.delete(id);
    window.dispatchEvent(new Event('generation-worker-finished'));
  });
  workers.set(id,task);
}
export function isGenerationPending(row: FrozenAttempt) {
  return !!row.h3 && !row.h3.issue && row.h3.status !== 'succeeded' && row.h3.status !== 'failed';
}
export async function recoverDesignGenerations() {
  for (const row of await listAttempts()) if (isGenerationPending(row)) ensureRunning(row.id);
}
export async function retryCollection(id: string) {
  await updateH3Record(id,{issue:undefined});
  ensureRunning(id);
}
export interface GenerationOptions {
  id: string; task: Task; goal?: string; parentCandidateId?: string;
  /** 自由提示：text 是设计者写的原文，原样发给模型。 */
  method?: 'free'; text?: string;
  /** 画布上的参考图：编号是它在画布上的节点，原件须为 PNG。 */
  reference?: { id: string; file: Blob };
}

/** 把设计者放到画布上的参考图转成服务可以接收的 PNG：短边不小于 128，长边不超过 2048，长宽比不超过 4。 */
export async function referencePng(source: Blob): Promise<Blob> {
  let picture: ImageBitmap;
  try { picture = await createImageBitmap(source); }
  catch { throw new Error('浏览器无法读取这张参考图。'); }
  try {
    const { width, height } = picture;
    if (Math.max(width, height) / Math.min(width, height) > 4) throw new Error('参考图过于狭长，长宽比需在 4 以内。');
    const scale = Math.max(Math.min(1, 2048 / Math.max(width, height)), 128 / Math.min(width, height));
    if (scale === 1 && source.type === 'image/png') return source;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    canvas.getContext('2d')!.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(file => file ? resolve(file) : reject(new Error('参考图转换失败。')), 'image/png'));
  } finally { picture.close(); }
}

/**
 * 结构化方式实际发给模型的全文：读条件图的固定说明、由造型和目标编译的文字、第二张图的读法（如果接了图）、这一轮的目标（如果写了）。
 * 生成面板显示的和冻结、发出的是这同一段，设计者确认的就是模型收到的。
 */
export function structuredText(parameters: DroneParameters, touched: Record<string, boolean>, intent: DesignIntent,
  second: 'candidate' | 'reference' | undefined, requestedGoal?: string) {
  const prompt = compilePrompt(parameters, touched, intent, computeLayout(parameters));
  let text = 'Image 1 is a motor-axis layout guide only. Replace dots and lines with a complete industrial product and omit all visible guide marks.\n' + prompt.text;
  if (second === 'candidate') text += '\nImage 2 is the appearance parent to revise. Preserve its visual identity while applying the current layout and design changes.';
  else if (second === 'reference') text += '\nImage 2 is an appearance reference chosen by the designer. Borrow its form language and surface treatment where they fit, while the motor-axis layout follows Image 1.';
  if (requestedGoal?.trim()) {
    const context = suggestFields(requestedGoal).state;
    const storageOnly = ['folded','carrying'].includes(context) ||
      (requestedGoal.trim() === intent.note.trim() && !prompt.sentences.some(sentence => sentence.id === 'intent_note'));
    if (storageOnly) text += '\nRender the specified unfolded layout. The designer’s storage or carrying goal concerns a separate use state and does not alter unfolded proportions.';
    else text += '\nDesign goal for this version: ' + requestedGoal.trim();
  }
  return text;
}

/** 自由提示这一轮在画布上的标题：原文的第一行，过长时截短。发给模型的仍是全文。 */
export const freeTitle = (text: string) => { const line = text.trim().split(/\r?\n/)[0]; return line.length > 60 ? line.slice(0, 58) + '…' : line; };

async function start({id, task, goal: requestedGoal, parentCandidateId, reference, method, text: freeText}: GenerationOptions) {
  // Read the live draft at click time; a saved variant snapshot can be older.
  const {parameters, touched, intent, designChatAudit, variants, activeVariant, workflowOrigin} = taskStores[task].getState();
  const state = structuredClone({parameters, touched, intent, designChatAudit});
  const variant = variants.find(v => v.id === activeVariant);
  const name = variant?.name ?? activeVariant;
  const variantScope = task + '/' + (variant?.workflowKey ?? activeVariant);
  const goal = requestedGoal?.trim() || intent.note.trim() || name + ' · ' + taskLabels[intent.taskId ?? 'consumer_camera'] + ' · ' + frameRules[parameters.frame.frame_type].zh;
  if (!await findAttempt(id)) {
    const candidate = parentCandidateId
      ? (await findAttempt(parentCandidateId.split('/')[0]))?.candidates.find(c => c.id === parentCandidateId)
      : undefined;
    if (parentCandidateId && !candidate) throw new Error('找不到所选候选的原图，请重新选择。');
    const parent = candidate ?? reference;
    if (method === 'free') {
      // 不编译、不加前后缀：冻结并发出的就是设计者写下的这段话。
      const words = (freeText ?? '').trim();
      if (!words) throw new Error('先写下要发给模型的文字。');
      await freezeAttempt(state, {variantId: activeVariant, variantName: name, variantScope, workflowOrigin, goal: freeTitle(words), keep: '', condition: 'free',
        h3: {model: (await imageBackend()).model, status: 'ready'}}, words, parent, undefined, id);
      ensureRunning(id);
      return id;
    }
    const text = structuredText(state.parameters, state.touched, state.intent, candidate ? 'candidate' : reference ? 'reference' : undefined, requestedGoal);
    await freezeAttempt(state, {variantId: activeVariant, variantName: name, variantScope, workflowOrigin, goal, keep: '', condition: 'structured',
      h3: {model: (await imageBackend()).model, status: 'ready'}}, '', parent, text, id);
  }
  ensureRunning(id);
  return id;
}

export function startDesignGeneration(options: GenerationOptions) {
  const existing = preparing.get(options.id);
  if (existing) return existing;
  const task = start(options).finally(() => preparing.delete(options.id));
  preparing.set(options.id, task);
  return task;
}

export function generationStatus(row: FrozenAttempt) {
  if (row.h3?.status === 'succeeded') return {title:'效果图已生成',detail:modelLabel(row.h3.model) + ' 已返回本轮效果图。'};
  if (row.h3?.status === 'failed') return {title:'生成未完成',detail:row.h3.issue || '服务已保存本轮失败记录。'};
  if (row.h3?.issue) return {title:'本轮生成需要恢复',detail:row.h3.issue};
  if (row.h3?.status === 'running') return {title:'等待回图',detail:'可以继续编辑，完成后效果图会自动保存。'};
  if (row.h3?.status === 'ready') return {title:'已准备设计输入',detail:'已冻结本轮规格和参考图。'};
  if (row.h3) return {title:'正在提交',detail:'本轮已保存当前设计输入。'};
  if (row.receipt) return {title:'已收到历史回图',detail:'已归档 ' + row.candidates.length + ' 张候选图。'};
  if (row.failure) return {title:'历史轮次运行失败',detail:'可在研究详情中查看原始回执。'};
  return {title:'设计输入已保存', detail:'可在研究详情中查看本轮记录。'};
}
