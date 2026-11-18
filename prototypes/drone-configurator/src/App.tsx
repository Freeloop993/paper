import React, { useEffect, useState } from 'react';
import TopBar, { steps, type Step } from './components/Shell/TopBar';
import InsightPage from './components/Insight/InsightPage';
import StudioPage from './components/Studio/StudioPage';
import HandoffPage from './components/Handoff/HandoffPage';
import { useDroneStore } from './store/droneStore';
import { frameRules } from './design/design';
import { parseImported } from './design/exporters';
import type { ParameterGroup } from './types/DroneParameters';

function useWide() {
  const query = '(min-width: 1180px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

/**
 * 复核用：地址栏 #step=studio&cfg=<base64 规格>&pin=<base64 对比规格>&tab=frame&q=小巧 可直接还原一次导出的状态；
 * 再加 &set=frame.arm_width_mm="20mm" 会在还原后照常改一项。
 */
function readHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const decode = (value: string | null): unknown => {
    if (!value) return null;
    try {
      const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
    } catch { return null; }
  };
  const sets = params.getAll('set').map(item => {
    const at = item.indexOf('=');
    const raw = item.slice(at + 1);
    let value: unknown = raw;
    try { value = JSON.parse(raw); } catch { /* 不是 JSON 就按字符串处理 */ }
    return { path: item.slice(0, at), value };
  });
  const step = params.get('step');
  return {
    config: decode(params.get('cfg')), pinned: decode(params.get('pin')), tab: params.get('tab') as ParameterGroup | null,
    step: steps.some(s => s.id === step) ? (step as Step) : null, query: params.get('q') ?? '', sets,
  };
}

const App: React.FC = () => {
  const [hash] = useState(readHash);
  const [step, setStep] = useState<Step>(hash.step ?? 'insight');
  const wide = useWide();
  const { parameters, importSnapshot, pin, setField } = useDroneStore();

  useEffect(() => {
    try {
      if (hash.pinned) {
        const base = parseImported(hash.pinned, parameters);
        importSnapshot(base);
        pin(frameRules[base.parameters.frame.frame_type].zh);
      }
      if (hash.config) importSnapshot(parseImported(hash.config, parameters));
      for (const item of hash.sets) setField(item.path, item.value);
    } catch (e) { console.error('无法读入地址栏中的规格', e); }
    // 只在首次载入时读取地址栏。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const fill = wide && step !== 'insight';
  return (
    <div className={`bg-canvas ${fill ? 'flex h-screen flex-col overflow-hidden' : 'min-h-screen'}`} id="drone-configurator-app" data-layout={wide ? 'wide' : 'narrow'} data-step-active={step}>
      <TopBar step={step} onStep={setStep} />
      <main className={fill ? 'min-h-0 flex-1' : ''}>
        {step === 'insight' && <InsightPage wide={wide} onNext={() => setStep('studio')} initialQuery={hash.query} />}
        {step === 'studio' && <StudioPage wide={wide} initialTab={hash.tab} />}
        {step === 'handoff' && <HandoffPage wide={wide} />}
      </main>
    </div>
  );
};

export default App;
