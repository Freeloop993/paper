import { useEffect, useRef, type ImgHTMLAttributes } from 'react';
import { markPresented } from '../candidateRecords';
import type { WorkflowNode } from './types';

type ImageNode = Pick<WorkflowNode, 'id' | 'image' | 'firstShown' | 'candidateId' | 'attemptId'>;
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'ref'> & { node: ImageNode };
const inFlight = new Map<string, Promise<void>>();

function recordOnce(attempt: string, candidate: string) {
  const key = JSON.stringify([attempt, candidate]);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = markPresented(attempt, candidate).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

/** Only a decoded, visible receipt-backed candidate counts as a presentation. */
export default function WorkflowImage({ node, alt, ...props }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const { image, candidateId, attemptId, firstShown } = node;
  useEffect(() => {
    const img = ref.current;
    if (!img || !image || !candidateId || !attemptId || firstShown) return;
    let intersects = false, recorded = false;
    const check = () => {
      if (recorded || !intersects || !img.complete || !img.naturalWidth || document.visibilityState !== 'visible') return;
      if (img.closest('[inert], [hidden], [aria-hidden="true"]') || getComputedStyle(img).visibility !== 'visible') return;
      if (img.checkVisibility && !img.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
      const modal = document.querySelector('dialog:modal');
      if (modal && !modal.contains(img)) return;
      recorded = true;
      void recordOnce(attemptId, candidateId).catch(() => {
        recorded = false;
        window.dispatchEvent(new CustomEvent('workflow-image-error', { detail: '候选已显示，首次展示时间未能写入本机记录。' }));
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting && entry.intersectionRatio > 0;
      check();
    }, { threshold: [0, 0.001] });
    observer.observe(img);
    // The shell keeps its canvas mounted when an editor covers it.
    const visibility = new MutationObserver(check);
    for (let parent: HTMLElement | null = img; parent; parent = parent.parentElement)
      visibility.observe(parent, { attributes: true, attributeFilter: ['inert', 'hidden', 'aria-hidden', 'class', 'style'] });
    img.addEventListener('load', check);
    document.addEventListener('visibilitychange', check);
    document.addEventListener('close', check, true);
    return () => {
      observer.disconnect();
      visibility.disconnect();
      img.removeEventListener('load', check);
      document.removeEventListener('visibilitychange', check);
      document.removeEventListener('close', check, true);
    };
  }, [image, candidateId, attemptId, firstShown]);
  if (!image) return null;
  return <img {...props} ref={ref} src={image} alt={alt ?? ''} />;
}
