import { ArrowLeft, BookOpen, Check, ChevronRight, GitFork, Grid2X2, Layers3, ScanLine, SlidersHorizontal, Undo2, Workflow } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import './workbench.css';

export type Step = 'canvas'|'insight'|'studio'|'handoff';
export type BoardId = 'history' | 'project';
export const toolNames: Record<Step,string> = {canvas:'方案画布',insight:'设计目标',studio:'调整参数',handoff:'候选图'};
const tools = [{id:'insight',Icon:BookOpen},{id:'studio',Icon:SlidersHorizontal},{id:'handoff',Icon:ScanLine}] as const;

export function CanvasTopBar({step,board,onBoard,onStep,onGenerate}: {
  step:Step; board:BoardId; onBoard:(board:BoardId)=>void; onStep:(step:Step)=>void; onGenerate:()=>void;
}) {
  const {history,undo,resetToDefaults}=useDroneStore();
  return <header className="canvas-topbar">
    <div className="canvas-brand"><span className="canvas-logo" aria-hidden="true"><Workflow size={21} strokeWidth={2}/></span><strong>多旋翼造型工作台</strong></div>
    <span className="canvas-top-divider" />
    <span className="canvas-breadcrumb">工作空间 <ChevronRight size={13}/> <b>{toolNames[step]}</b></span>
    <div className="canvas-top-controls">
      {step==='canvas' ? <div className="canvas-switch" aria-label="选择画布">
        <button onClick={()=>onBoard('project')} data-board="project" aria-pressed={board==='project'}><Layers3 size={14}/>我的项目</button>
        <button onClick={()=>onBoard('history')} data-board="history" aria-pressed={board==='history'}><GitFork size={14}/>B2 案例</button>
      </div> : <>
        {step==='studio' && <><button className="canvas-small-tool" data-testid="undo" onClick={undo} disabled={!history.length} title="撤销上一步"><Undo2 size={15}/><span>撤销</span></button><button className="canvas-small-tool canvas-reset" data-testid="reset" onClick={resetToDefaults}>重置参数</button></>}
        <button className="canvas-return" onClick={()=>onStep('canvas')} data-step="canvas"><ArrowLeft size={15}/>返回画布</button>
        {step==='studio' && <button className="canvas-action primary" data-testid="studio-generate" onClick={onGenerate}><ScanLine size={15}/>生成候选图</button>}
      </>}
    </div>
  </header>;
}

export function CanvasRail({step,onStep}:{step:Step;onStep:(step:Step)=>void}) {
  return <nav className="canvas-rail" aria-label="工作台工具">
    <button className="canvas-rail-btn" data-step="canvas" aria-current={step==='canvas'?'page':undefined} onClick={()=>onStep('canvas')} title="方案画布"><Grid2X2 size={20}/><span>画布</span></button>
    <div className="canvas-rail-rule" />
    {tools.map(({id,Icon})=><button key={id} className="canvas-rail-btn" data-step={id} title={toolNames[id]} aria-label={toolNames[id]} aria-current={step===id?'page':undefined} onClick={()=>onStep(id)}>
      <Icon size={19}/><span>{id==='insight'?'目标':id==='studio'?'参数':'候选图'}</span>
    </button>)}
  </nav>;
}

export function LocalStatus({board}:{board:BoardId}) {
  return <span className="canvas-local-status">{board==='history'?<><BookOpen size={13}/>案例档案 · 只读</>:<><Check size={13}/>本机工作区</>}</span>;
}
