import React, { useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import { StepTitle } from './components/Layout/StepTitle';
import FrameParameters from './components/Parameters/FrameParameters';
import PropulsionParameters from './components/Parameters/PropulsionParameters';
import FuselageParameters from './components/Parameters/FuselageParameters';
import LandingGearParameters from './components/Parameters/LandingGearParameters';
import AccessoriesParameters from './components/Parameters/AccessoriesParameters';
import ParameterOverview from './components/Overview/ParameterOverview';
import InterfacePreview from './components/DevPreview/InterfacePreview';
import PromptGenerator from './components/DevPreview/PromptGenerator';
import IntentCard from './components/Intent/IntentCard';
import { useDroneStore } from './store/droneStore';
import { frameRules } from './design/design';
import { parseImported } from './design/exporters';
import type { ParameterGroup } from './types/DroneParameters';
import { Settings, Zap, Box, Anchor, Camera, RefreshCw, Undo2 } from 'lucide-react';

const tabs: { id: ParameterGroup; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'frame', label: '机架', icon: Settings },
  { id: 'propulsion', label: '动力', icon: Zap },
  { id: 'fuselage', label: '机身', icon: Box },
  { id: 'landing_gear', label: '起落架', icon: Anchor },
  { id: 'accessories', label: '配件', icon: Camera },
];

function useWide() {
  const query = '(min-width: 1024px)';
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
 * 复核用：地址栏 #cfg=<base64 规格>&pin=<base64 对比规格>&tab=frame&evidence=1&q=小巧 可直接还原一次导出的状态；
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
  return { config: decode(params.get('cfg')), pinned: decode(params.get('pin')), tab: params.get('tab') as ParameterGroup | null, evidence: params.get('evidence') === '1', query: params.get('q') ?? '', sets };
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ParameterGroup>('frame');
  const [hash] = useState(readHash);
  const wide = useWide();
  const { parameters, importSnapshot, pin, setField, resetToDefaults, undo, history } = useDroneStore();

  useEffect(() => {
    if (hash.tab && tabs.some(t => t.id === hash.tab)) setActiveTab(hash.tab);
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

  const controls = (
    <>
      <IntentCard initialQuery={hash.query} initiallyOpen={hash.evidence} />

      <section className="card" aria-label="部件参数">
        <StepTitle n={2} title="部件参数" en="Parameters">在五个页签里选择和拖动，预览会跟着变。</StepTitle>
        <div className="mb-6 mt-4 flex flex-wrap gap-2" role="tablist" aria-label="部件页签">
          {tabs.map(tab => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} data-tab={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium sm:px-4 sm:text-base ${activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <tab.icon className="hidden h-4 w-4 sm:block" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {activeTab === 'frame' && <FrameParameters />}
          {activeTab === 'propulsion' && <PropulsionParameters />}
          {activeTab === 'fuselage' && <FuselageParameters />}
          {activeTab === 'landing_gear' && <LandingGearParameters />}
          {activeTab === 'accessories' && <AccessoriesParameters />}
        </div>
        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={undo} disabled={!history.length} data-testid="undo" className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
            <Undo2 className="h-4 w-4" />撤销上一步
          </button>
          <button type="button" onClick={resetToDefaults} data-testid="reset" className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />重置参数
          </button>
        </div>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50" id="drone-configurator-app" data-layout={wide ? 'wide' : 'narrow'}>
      <Header />
      {!wide && <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur"><InterfacePreview compact /></div>}
      <main className="mx-auto max-w-7xl space-y-6 px-3 py-6 sm:px-4 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">{controls}</div>
          {wide && <div className="lg:col-span-5"><div className="sticky top-4"><InterfacePreview /></div></div>}
        </div>

        <div className="pt-2">
          <StepTitle n={3} title="确认与导出" en="Review & Export">核对将要发出的文字和规格，没问题就导出。</StepTitle>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7"><PromptGenerator /></div>
          <div className="lg:col-span-5"><ParameterOverview /></div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
