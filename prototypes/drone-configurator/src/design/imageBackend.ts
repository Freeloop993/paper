// 图像后端：MiniMax H3（开发用）或本机 ComfyUI 上的 Qwen（计入论文的场次）。由本机服务告知当前接的是哪一个。
import { useEffect, useState } from 'react';

export type ImageModel = 'MiniMax-H3-Image' | 'Qwen-Image-2.1';
export interface ImageBackend { provider: 'minimax' | 'qwen-comfy'; model: ImageModel; endpoint: string; label: string }
export const minimaxBackend: ImageBackend = { provider: 'minimax', model: 'MiniMax-H3-Image', endpoint: '/v1/images/edits', label: 'MiniMax H3 Image' };
export const qwenBackend: ImageBackend = { provider: 'qwen-comfy', model: 'Qwen-Image-2.1', endpoint: '/prompt', label: 'Qwen-Image 2.1（本机 ComfyUI）' };
/** 一轮记录冻结时登记的模型决定了它该由哪个后端应答。 */
export const backendOf = (model?: string): ImageBackend => model === qwenBackend.model ? qwenBackend : minimaxBackend;
export const modelLabel = (model?: string) => backendOf(model).label;

let current: Promise<ImageBackend> | undefined;
export function imageBackend(): Promise<ImageBackend> {
  current ??= (async () => {
    if (!['http:', 'https:'].includes(location.protocol)) return minimaxBackend;
    try {
      const response = await fetch('/api/h3/backend', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      const info = response.ok ? await response.json() : null;
      return info?.provider === qwenBackend.provider && info?.model === qwenBackend.model ? qwenBackend : minimaxBackend;
    } catch { return minimaxBackend; }
  })();
  return current;
}
export function useImageBackend() {
  const [backend, setBackend] = useState<ImageBackend>(minimaxBackend);
  useEffect(() => { let live = true; void imageBackend().then(value => { if (live) setBackend(value); }); return () => { live = false; }; }, []);
  return backend;
}
