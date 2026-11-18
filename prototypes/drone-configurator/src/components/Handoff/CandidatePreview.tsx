import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';

interface Props {
  candidate: FrozenAttempt['candidates'][number];
  show?: boolean;
  onVisible: () => Promise<void>;
  onError: (message: string) => void;
}

export default function CandidatePreview({candidate, show = false, onVisible, onError}: Props) {
  const [visible, setVisible] = useState(show);
  const [url, setUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Images are immutable per candidate ID. Callers key previews by that ID.
  const [original] = useState(() => candidate.file);
  const callback = useRef(onVisible), err = useRef(onError);
  callback.current = onVisible;
  err.current = onError;

  useEffect(() => {
    if (!visible) return;
    const src = URL.createObjectURL(original);
    setUrl(src);
    return () => URL.revokeObjectURL(src);
  }, [visible, original]);
  useEffect(() => {
    if (!loaded || candidate.firstShown || !img.current) return;
    let seen = false, inside = false;
    const check = () => {
      if (seen || !inside || document.visibilityState !== 'visible') return;
      seen = true;
      callback.current().catch(error => { err.current(String(error)); seen = false; });
    };
    const observer = new IntersectionObserver(([entry]) => { inside = entry.isIntersecting; check(); });
    observer.observe(img.current);
    document.addEventListener('visibilitychange', check);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', check); };
  }, [loaded, candidate.firstShown]);
  return visible ? (url && <img ref={img} src={url} alt={'已收到的候选 ' + candidate.name} className={show ? 'generation-output-image' : 'mt-2 max-h-72 w-full rounded-lg object-contain'} onLoad={() => setLoaded(true)} onError={() => err.current('图片无法显示。')}/>)
    : <button className="btn-ghost" data-show-candidate={candidate.id} onClick={() => setVisible(true)}><Camera size={14}/>查看候选</button>;
}
