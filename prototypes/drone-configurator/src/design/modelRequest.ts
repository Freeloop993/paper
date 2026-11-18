import { sha256Bytes } from './sha256';

/** Qwen/ComfyUI workflow used by the archived E3 model run. Only confirmed text and attached inputs enter it. */
export function compileModelRequest(id: string, text: string, seed: number, images: string[]) {
  if (!text.trim() || !Number.isSafeInteger(seed) || seed < 0 || images.length > 2)
    throw new Error('请确认提示词和非负整数种子。');
  const encoder: Record<string, unknown> = {
    clip: ['2', 0], vae: ['3', 0], prompt: text, negative_prompt: 'text, labels, logo, collage, cropped product',
    resolution: 1024,
  };
  const graph: Record<string, { class_type: string; inputs: Record<string, unknown> }> = {
    '1': {class_type:'UNETLoader', inputs:{unet_name:'qwen_image_2.1_bf16.safetensors',weight_dtype:'default'}},
    '2': {class_type:'CLIPLoader', inputs:{clip_name:'qwen3vl_8b_bf16.safetensors',type:'qwen_image',device:'default'}},
    '3': {class_type:'VAELoader', inputs:{vae_name:'qwen_image_2.1_vae_bf16.safetensors'}},
    '4': {class_type:'TextEncodeQwenImage21', inputs:encoder},
    '10': {class_type:'KSampler', inputs:{model:['1',0],positive:['4',0],negative:['4',1],latent_image:['4',2],
      seed,steps:40,cfg:3,sampler_name:'euler',scheduler:'simple',denoise:1}},
    '11': {class_type:'VAEDecode',inputs:{samples:['10',0],vae:['3',0]}},
    '12': {class_type:'SaveImage',inputs:{images:['11',0],filename_prefix:'studio-'+id.replace(/[^a-zA-Z0-9_-]/g,'-')}},
  };
  images.forEach((name,index) => {
    const node = String(15 + index);
    graph[node] = {class_type:'LoadImage',inputs:{image:name}};
    encoder['images.image_'+(index+1)] = [node,0];
  });
  return new Blob([JSON.stringify({client_id:'studio-'+id,prompt:graph})],{type:'application/json'});
}

export function serverAddress(value: string) {
  const address = new URL(value.trim());
  if (!['http:', 'https:'].includes(address.protocol) || address.username || address.password || address.search || address.hash)
    throw new Error('服务地址应为 HTTP(S) 地址，可包含路径。');
  return address.origin + address.pathname.replace(/\/+$/, '');
}

async function getResponse(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {...init, cache:'no-store', credentials:'omit', signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error('服务返回 HTTP '+response.status+' '+(await response.text()).slice(0,180));
  return response;
}

export async function modelImageName(image: Blob) {
  const bytes = new Uint8Array(await image.arrayBuffer());
  const png = [137,80,78,71,13,10,26,10];
  if (!png.every((n,i)=>bytes[i]===n)) throw new Error('条件图和父图须为原始 PNG。');
  return 'studio-'+sha256Bytes(bytes)+'.png';
}

export async function uploadModelImage(server: string, image: Blob) {
  const name = await modelImageName(image);
  const form = new FormData();
  form.append('image',image,name);
  form.append('type','input');
  const reply = await (await getResponse(server+'/upload/image',{method:'POST',body:form})).json();
  if (typeof reply.name !== 'string' || !reply.name || (reply.type && reply.type !== 'input'))
    throw new Error('服务没有返回输入图的名称。');
  return [reply.subfolder,reply.name].filter(Boolean).join('/');
}

export async function sendModelRequest(server: string, request: Blob) {
  return (await getResponse(server+'/prompt',{method:'POST',body:request})).blob();
}

export async function jobId(ack: Blob) {
  const response = JSON.parse(await ack.text());
  if (typeof response.prompt_id !== 'string' || !response.prompt_id || Object.keys(response.node_errors ?? {}).length)
    throw new Error('后端未确认入队，请检查服务回执。');
  return response.prompt_id as string;
}

interface OutputImage { filename:string; subfolder?:string; type?:string }
export async function readModelOutputs(server: string, id: string) {
  const history = await (await getResponse(server+'/history/'+encodeURIComponent(id))).blob();
  const response = JSON.parse(await history.text());
  const run = response[id];
  if (!run || (!run.status?.completed && !['error','interrupted'].includes(run.status?.status_str))) return null;
  if (run.status?.status_str !== 'success') return {failed:true as const, history};
  const refs = Object.values(run.outputs ?? {}).flatMap(node => (node as {images?:OutputImage[]}).images ?? [])
    .filter(item=>item.type==='output');
  if (!refs.length) throw new Error('运行已结束，未返回可导入的候选图。');
  const files:File[] = [];
  for (const image of refs) {
    const query = new URLSearchParams({filename:image.filename,subfolder:image.subfolder ?? '',type:'output'});
    const body = await (await getResponse(server+'/view?'+query)).blob();
    files.push(new File([body],image.filename,{type:'image/png'}));
  }
  return {failed:false as const,history,files};
}
