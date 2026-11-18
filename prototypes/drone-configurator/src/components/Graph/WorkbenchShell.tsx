import { BookOpen, FileSearch, GitFork, Layers3, ListTree, Undo2, Workflow, X } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import './workbench.css';

export type Step = 'canvas'|'insight'|'studio'|'handoff';
export type BoardId = 'history' | 'project';
export const toolNames: Record<Step,string> = {canvas:'设计画布',insight:'设计目标',studio:'造型',handoff:'研究详情与导出'};

export function CanvasTopBar({board,research,drawer,onBoard,onResearch,onDrawer}: {
  board:BoardId; research:boolean; drawer:boolean; onBoard:(board:BoardId)=>void; onResearch:(on:boolean)=>void; onDrawer:(open:boolean)=>void;
}) {
  const {history,undo,variants,activeVariant}=useDroneStore();
  const project = board==='project';
  return <header className="canvas-topbar">
    <div className="canvas-brand"><span className="canvas-logo" aria-hidden="true"><Workflow size={21} strokeWidth={2}/></span><strong>多旋翼造型工作台</strong></div>
    <span className="canvas-top-divider" />
    <div className="canvas-switch" aria-label="选择画布">
      <button onClick={()=>onBoard('project')} data-board="project" aria-pressed={project}><Layers3 size={14}/>我的项目</button>
      <button onClick={()=>onBoard('history')} data-board="history" aria-pressed={!project}><GitFork size={14}/>B2 案例</button>
    </div>
    <span className="canvas-local-status">{project ? <>本机工作区{variants.length>1 && ' · '+variants.find(v=>v.id===activeVariant)?.name}</> : <><BookOpen size={13}/>案例档案 · 只读</>}</span>
    <div className="canvas-top-controls">
      {drawer ? <button className="canvas-return" onClick={()=>onDrawer(false)} data-step="canvas"><X size={15}/>回到画布</button> : project && <>
        <button className="canvas-small-tool" data-testid="top-undo" onClick={undo} disabled={!history.length} title="撤销上一步"><Undo2 size={15}/><span>撤销</span></button>
        <button className="canvas-small-tool" aria-pressed={research} data-testid="research-layer" onClick={()=>onResearch(!research)}
          title="在画布上显示每一轮冻结的规格和布局条件图"><ListTree size={15}/><span>显示留档</span></button>
        <button className="canvas-small-tool" data-step="handoff" data-testid="open-research" onClick={()=>onDrawer(true)}
          title="核对提示词与规格、导出，查看全部轮次和历史回放"><FileSearch size={15}/><span>研究详情与导出</span></button>
      </>}
    </div>
  </header>;
}
