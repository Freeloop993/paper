import React, { useEffect, useState } from 'react';
import { CanvasRail, CanvasTopBar, toolNames, type Step, type BoardId } from './components/Graph/WorkbenchShell';
import WorkflowWorkspace from './components/Graph/WorkflowWorkspace';
import InsightPage from './components/Insight/InsightPage';
import StudioPage from './components/Studio/StudioPage';
import HandoffPage, { type HandoffEntry } from './components/Handoff/HandoffPage';
import { useDroneStore } from './store/droneStore';
import { frameRules } from './design/design';
import { parseImported } from './design/exporters';
import type { ParameterGroup } from './types/DroneParameters';
import { recoverDesignGenerations } from './design/generation';

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
    board: params.get('board') === 'project' ? 'project' as const : params.get('board') === 'history' ? 'history' as const : undefined,
    node:params.get('node') || undefined,
    step: step && Object.prototype.hasOwnProperty.call(toolNames,step) ? (step as Step) : null, query: params.get('q') ?? '', sets,
  };
}

const App: React.FC = () => {
  const [hash] = useState(readHash);
  const [step, setStep] = useState<Step>(hash.step ?? 'canvas');
  const [board, setBoard] = useState<BoardId>(() => {
    if (hash.board) return hash.board;
    if (hash.step && hash.step!=='canvas') return 'project';
    try { return localStorage.getItem('workflow/last-board')==='history' ? 'history' : 'project'; }
    catch { return 'project'; }
  });
  const [handoff, setHandoff] = useState<HandoffEntry>();
  const [focusNode,setFocusNode]=useState(hash.node);
  const wide = useWide();
  const { parameters, importSnapshot, pin, setField, activeVariant } = useDroneStore();

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
  useEffect(() => { void recoverDesignGenerations().catch(console.error); }, []);
  useEffect(() => {
    const sync = () => {
      const next=readHash();
      setStep(next.step ?? 'canvas');
      if(next.board) setBoard(next.board);
      setFocusNode(next.node);
      setHandoff(undefined);
    };
    window.addEventListener('hashchange',sync);
    window.addEventListener('popstate',sync);
    return () => {
      window.removeEventListener('hashchange',sync);
      window.removeEventListener('popstate',sync);
    };
  },[]);
  function navigate(next:Step, nextBoard:BoardId=next==='canvas'?board:'project', entry?:HandoffEntry,nodeId?:string) {
    setStep(next); setBoard(nextBoard); setHandoff(entry);setFocusNode(nodeId);
    try { localStorage.setItem('workflow/last-board',nextBoard); } catch { /* Navigation works without persistence. */ }
    const url=new URL(window.location.href);
    const destination=new URLSearchParams({step:next,board:nextBoard});
    if(nodeId) destination.set('node',nodeId);
    if(next==='studio' && hash.tab) destination.set('tab',hash.tab);
    url.hash=destination.toString();
    if(url.href!==window.location.href) window.history.pushState(null,'',url);
  }

  return (
    <div className="canvas-app-shell" id="drone-configurator-app" data-layout={wide ? 'wide' : 'narrow'} data-step-active={step}>
      <CanvasTopBar step={step} board={board} onBoard={next=>navigate('canvas',next)} onStep={next=>navigate(next)}
        onGenerate={()=>navigate('handoff','project',{generate:crypto.randomUUID()})}/>
      <div className="canvas-app-body">
      <CanvasRail step={step} onStep={next=>navigate(next)} />
      <main className="canvas-app-main">
        <div className="canvas-main-layer" inert={step==='canvas'?undefined:true} aria-hidden={step!=='canvas'} style={{visibility:step==='canvas'?'visible':'hidden'}}>
          <WorkflowWorkspace key={board+'-'+(focusNode ?? '')} board={board} initialSelected={focusNode} active={step==='canvas'} onBoard={(next,id)=>navigate('canvas',next,undefined,id)}
            onStep={next=>navigate(next)} onHandoff={entry=>navigate('handoff','project',entry)} />
        </div>
        {step!=='canvas' && <section className={`canvas-tool-layer ${wide && step!=='insight'?'canvas-tool-fill':''}`} aria-label={toolNames[step]}>
          {step === 'insight' && <InsightPage key={activeVariant} wide={wide} onNext={() => navigate('studio')} initialQuery={hash.query} />}
          {step === 'studio' && <StudioPage wide={wide} initialTab={hash.tab} />}
          {step === 'handoff' && <HandoffPage wide={wide} entry={handoff} />}
        </section>}
      </main>
      </div>
    </div>
  );
};

export default App;
