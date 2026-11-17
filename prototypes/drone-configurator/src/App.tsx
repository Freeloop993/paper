import React, { useEffect, useState } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import FrameParameters from './components/Parameters/FrameParameters';
import PropulsionParameters from './components/Parameters/PropulsionParameters';
import FuselageParameters from './components/Parameters/FuselageParameters';
import LandingGearParameters from './components/Parameters/LandingGearParameters';
import AccessoriesParameters from './components/Parameters/AccessoriesParameters';
import ParameterOverview from './components/Overview/ParameterOverview';
import InterfacePreview from './components/DevPreview/InterfacePreview';
import PromptGenerator from './components/DevPreview/PromptGenerator';
import EvidencePanel from './components/Evidence/EvidencePanel';
import { useDroneStore } from './store/droneStore';
import { fields, fieldStatus, isRelevant } from './design/fields';
import { frameRules } from './design/design';
import { parseImported } from './design/exporters';
import type { ParameterGroup } from './types/DroneParameters';
import { Settings, Zap, Box, Anchor, Camera } from 'lucide-react';

const tabs: { id: ParameterGroup; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'frame', label: '机架', icon: Settings },
  { id: 'propulsion', label: '动力', icon: Zap },
  { id: 'fuselage', label: '机身', icon: Box },
  { id: 'landing_gear', label: '起落架', icon: Anchor },
  { id: 'accessories', label: '配件', icon: Camera },
];

function useWide() {
  const query = '(min-width: 1280px)';
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
 * 复核用：地址栏 #cfg=<base64 配置>&pin=<base64 对照配置>&tab=frame&evidence=1 可直接还原一次导出的状态；
 * 再加 &set=frame.arm_width_mm=20mm 会在还原后照常改一项，用来重放“只改这一项”；&q=防水 预填证据卡搜索词。
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
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [initialQuery] = useState(() => readHash().query);
  const wide = useWide();
  const { parameters, touched, importSnapshot, pin, setField } = useDroneStore();

  useEffect(() => {
    const h = readHash();
    if (h.tab && tabs.some(t => t.id === h.tab)) setActiveTab(h.tab);
    if (h.evidence) setEvidenceOpen(true);
    try {
      if (h.pinned) {
        const base = parseImported(h.pinned, parameters);
        importSnapshot(base);
        pin(frameRules[base.parameters.frame.frame_type].zh);
      }
      if (h.config) importSnapshot(parseImported(h.config, parameters));
      for (const item of h.sets) setField(item.path, item.value);
    } catch (e) { console.error('无法读入地址栏中的配置', e); }
    // 只在首次载入时读取地址栏。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (group: ParameterGroup, path: string) => {
    setActiveTab(group);
    setTimeout(() => document.querySelector(`[data-field="${path}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };
  const count = (group: ParameterGroup, status: 'chosen' | 'open') =>
    fields.filter(f => f.group === group && isRelevant(f, parameters) && fieldStatus(f, parameters, touched) === status).length;

  const controls = (
    <div className="space-y-3">
      <EvidencePanel open={evidenceOpen} onToggle={setEvidenceOpen} initialQuery={initialQuery} />
      <section className="card !p-3 sm:!p-4" aria-label="参数页签">
        <div className="mb-3 grid grid-cols-5 gap-1" role="tablist" aria-label="部件页签">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            const chosen = count(tab.id, 'chosen'), open = count(tab.id, 'open');
            return (
              <button key={tab.id} type="button" role="tab" aria-selected={active} data-tab={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-1 py-1.5 text-center ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <span className="flex items-center justify-center gap-1 whitespace-nowrap text-sm font-medium"><tab.icon className="hidden h-4 w-4 sm:block" />{tab.label}</span>
                <span className={`block whitespace-nowrap text-[10px] leading-tight ${active ? 'text-primary-50' : 'text-slate-500'}`} title={`你选定 ${chosen} 项，留白 ${open} 项`}>
                  {chosen > 0 && open > 0 ? `选 ${chosen} · 留白 ${open}` : open > 0 ? `留白 ${open}` : chosen > 0 ? `已选 ${chosen}` : '默认值'}
                </span>
              </button>
            );
          })}
        </div>
        <div role="tabpanel">
          {activeTab === 'frame' && <FrameParameters />}
          {activeTab === 'propulsion' && <PropulsionParameters />}
          {activeTab === 'fuselage' && <FuselageParameters />}
          {activeTab === 'landing_gear' && <LandingGearParameters />}
          {activeTab === 'accessories' && <AccessoriesParameters />}
        </div>
      </section>
    </div>
  );

  if (wide)
    return (
      <div className="flex h-screen flex-col bg-slate-50" id="drone-configurator-app" data-layout="wide">
        <Header />
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(360px,410px)_minmax(0,1fr)_minmax(330px,380px)] gap-3 p-3">
          <div className="min-h-0 overflow-y-auto pr-1">{controls}</div>
          <div className="flex min-h-0 flex-col gap-3">
            <div className="shrink-0"><InterfacePreview /></div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1"><PromptGenerator autoScroll /></div>
          </div>
          <div className="min-h-0 overflow-y-auto pr-1"><ParameterOverview onJump={jump} /><Footer /></div>
        </main>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50" id="drone-configurator-app" data-layout="narrow">
      <Header />
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-2 pb-2 pt-2 backdrop-blur"><InterfacePreview compact /></div>
      <main className="space-y-3 px-2 py-3">
        {controls}
        <ParameterOverview onJump={jump} />
        <PromptGenerator />
      </main>
      <Footer />
    </div>
  );
};

export default App;
