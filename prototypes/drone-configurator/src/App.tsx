import React, { useEffect, useState } from 'react';
import { CanvasTopBar, toolNames, type Step, type BoardId } from './components/Graph/WorkbenchShell';
import CanvasWorkspace from './components/Canvas/CanvasWorkspace';
import { CanvasUiProvider } from './components/Canvas/canvasUi';
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
 * step=insight 选中目标卡片，step=studio 选中造型卡片，step=handoff 打开研究详情；它们都在同一块画布上。
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
    node:params.get('node') || undefined, research: params.get('layer') === 'research',
    step: step && Object.prototype.hasOwnProperty.call(toolNames,step) ? (step as Step) : null, query: params.get('q') ?? '', sets,
  };
}

const App: React.FC = () => {
  const [hash, setHash] = useState(readHash);
  // 页面已打开时再点一个带 #step= 的链接：按新地址重新进入画布，草稿和记录都在本机存储里。
  const [visit, setVisit] = useState(0);
  const [board, setBoard] = useState<BoardId>(() => {
    if (hash.board) return hash.board;
    if (hash.step && hash.step!=='canvas') return 'project';
    try { return localStorage.getItem('workflow/last-board')==='history' ? 'history' : 'project'; }
    catch { return 'project'; }
  });
  const [research, setResearch] = useState(hash.research);
  const [drawer, setDrawer] = useState<HandoffEntry | null>(hash.step === 'handoff' ? {} : null);
  const [focusNode,setFocusNode]=useState(hash.node);
  const [entry, setEntry] = useState<'goal'|'design'|undefined>(hash.step === 'insight' ? 'goal' : hash.step === 'studio' ? 'design' : undefined);
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
  useEffect(() => { void recoverDesignGenerations().catch(console.error); }, []);
  useEffect(() => {
    const sync = () => {
      const next=readHash();
      setHash(next); setVisit(n=>n+1);
      if(next.board) setBoard(next.board);
      setFocusNode(next.node);
      setDrawer(next.step === 'handoff' ? {} : null);
      setEntry(next.step === 'insight' ? 'goal' : next.step === 'studio' ? 'design' : undefined);
    };
    window.addEventListener('hashchange',sync);
    window.addEventListener('popstate',sync);
    return () => {
      window.removeEventListener('hashchange',sync);
      window.removeEventListener('popstate',sync);
    };
  },[]);
  function navigate(nextBoard:BoardId, nodeId?:string, open:HandoffEntry|null=null) {
    setBoard(nextBoard); setDrawer(open); setFocusNode(nodeId); setEntry(undefined);
    try { localStorage.setItem('workflow/last-board',nextBoard); } catch { /* Navigation works without persistence. */ }
    const url=new URL(window.location.href);
    const destination=new URLSearchParams({step:open?'handoff':'canvas',board:nextBoard});
    if(nodeId) destination.set('node',nodeId);
    url.hash=destination.toString();
    if(url.href!==window.location.href) window.history.pushState(null,'',url);
  }
  const step: Step = drawer ? 'handoff' : 'canvas';

  return (
    <div className="canvas-app-shell" id="drone-configurator-app" data-layout={wide ? 'wide' : 'narrow'} data-step-active={step}>
      <CanvasUiProvider key={visit} initialPart={hash.tab} initialGoal={hash.query}>
        <CanvasTopBar board={board} research={research} drawer={!!drawer} onBoard={next=>navigate(next)} onResearch={setResearch}
          onDrawer={open=>navigate('project',undefined,open?{}:null)}/>
        <main className="canvas-app-main">
          <div className="canvas-main-layer" inert={drawer?true:undefined} aria-hidden={!!drawer} style={{visibility:drawer?'hidden':'visible'}}>
            <CanvasWorkspace key={board+'-'+(focusNode ?? '')} board={board} research={research} initialSelected={focusNode} initialFocus={entry}
              onBoard={(next,id)=>navigate(next,id)} onResearch={open=>navigate('project',undefined,{...open,candidates:!!open?.attemptId})} />
          </div>
          {drawer && <section className="canvas-tool-layer" aria-label={toolNames.handoff}>
            <HandoffPage wide={wide} entry={drawer} />
          </section>}
        </main>
      </CanvasUiProvider>
    </div>
  );
};

export default App;
