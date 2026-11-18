import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, Check, ChevronDown, GitBranchPlus, ImagePlus, Link2, PanelRightClose, ScanLine, SlidersHorizontal, Target, X } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { useWorkflowGraph, type WorkflowNode } from '../../design/workflowGraph';
import WorkflowImage from '../../design/workflow/WorkflowImage';
import type { HandoffEntry } from '../Handoff/HandoffPage';
import GraphBoard from './GraphBoard';
import GraphInspector from './GraphInspector';
import { LocalStatus, type BoardId, type Step } from './WorkbenchShell';

interface Props {
  board:BoardId;
  active:boolean;
  onStep:(step:Step)=>void;
  onHandoff:(entry:HandoffEntry)=>void;
  onBoard:(board:BoardId,id?:string)=>void;
  initialSelected?:string;
}

function CompareImages({pictures,initial,onClose}:{pictures:WorkflowNode[];initial:[string,string];onClose:()=>void}) {
  const [ids,setIds]=useState(initial);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ const d=dialog.current; d?.showModal(); return ()=>{d?.close();}; },[]);
  return <dialog ref={dialog} className="canvas-dialog canvas-comparison" onCancel={onClose} aria-labelledby="compare-title">
    <header><h2 id="compare-title">图片对照</h2><button className="canvas-icon-button" onClick={onClose} aria-label="关闭图片对照"><X size={18}/></button></header>
    <div className="canvas-compare-grid">{ids.map((id,side)=>{
      const item=pictures.find(n=>n.id===id);
      return <div key={side} className="canvas-compare-item">
        <label><span>{side===0?'左图':'右图'}</span><select aria-label={side===0?'选择左图':'选择右图'} value={id} onChange={event=>setIds(old=>side===0?[event.target.value,old[1]]:[old[0],event.target.value])}>
          {pictures.map(n=><option key={n.id} value={n.id} disabled={ids[1-side]===n.id}>{n.title}</option>)}
        </select></label>
        {item && <><div className="canvas-comparison-image"><WorkflowImage node={item} alt={item.title}/></div><p>{item.subtitle ?? item.source ?? item.title}</p></>}
      </div>;
    })}</div>
  </dialog>;
}

export default function WorkflowWorkspace({board,active,onStep,onHandoff,onBoard,initialSelected}:Props) {
  const graph=useWorkflowGraph(board);
  const {activeVariant,switchVariant}=useDroneStore();
  const [selectedId,setSelected]=useState<string|null>(initialSelected ?? null);
  const [panel,setPanel]=useState(Boolean(initialSelected));
  const [linkFrom,setLinkFrom]=useState<string|null>(null);
  const [linkMode,setLinkMode]=useState(false);
  const [compare,setCompare]=useState<[string,string]|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [modalNode,setModalNode]=useState<WorkflowNode|null>(null);
  const [branchName,setBranchName]=useState('');
  const [busy,setBusy]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const upload=useRef<HTMLInputElement>(null);
  const toolsMenu=useRef<HTMLDetailsElement>(null);
  const selected=graph.nodes.find(node=>node.id===selectedId);
  const draft=graph.nodes.find(node=>node.isDraft && node.variantId===activeVariant);
  const historical=board==='history';
  const pictures=graph.nodes.filter(n=>n.image);
  useEffect(()=>{ if(!message) return; const id=setTimeout(()=>setMessage(''),4500); return ()=>clearTimeout(id); },[message]);
  useEffect(()=>{
    if(!modalNode) return;
    const d=dialog.current;d?.showModal();return ()=>d?.close();
  },[modalNode]);
  function selectOnly(id:string|null) {
    setSelected(id);setPanel(Boolean(id));setError('');
  }
  async function connect(from:string,to:string) {
    try {
      await graph.addReference(from,to);
      setLinkMode(false);setLinkFrom(null);setError('');setMessage('已添加参考关系');setSelected(to);
    } catch(e) { setError(e instanceof Error?e.message:'无法添加这条关联。'); }
  }
  function select(id:string|null) {
    if(id && linkMode) {
      if(!linkFrom) {setLinkFrom(id);setSelected(id);}
      else void connect(linkFrom,id);
    } else selectOnly(id);
  }
  function branch(nodeId:string) {
    const node=graph.nodes.find(n=>n.id===nodeId);
    if(!node || !node.canBranch) return;
    setBranchName('');setModalNode(node);setError('');
  }
  async function saveBranch() {
    if(!modalNode || busy) return;
    setBusy(true);
    try {
      const id=await graph.saveBranch(modalNode.id,branchName.trim() || undefined);
      setModalNode(null);selectOnly(id);setMessage('版本已保存，可以继续编辑草稿');
    } catch(e) {setError(e instanceof Error?e.message:'版本保存失败。');}
    finally {setBusy(false);}
  }
  async function restore(id:string) {
    try {
      await graph.restoreSnapshot(id);setPanel(false);setError('');setMessage('已载入所选版本');
      onStep('studio');
    } catch(e) {setError(e instanceof Error?e.message:'无法从此版本继续。');}
  }
  function startCompare() {
    if(pictures.length<2) return;
    const upper=historical && pictures.find(n=>n.id==='b2-upper');
    const lower=historical && pictures.find(n=>n.id==='b2-lower');
    const left=upper || pictures.find(n=>n.id===selectedId) || pictures[0];
    const right=lower && lower.id!==left.id ? lower : pictures.find(n=>n.id!==left.id)!;
    setCompare([left.id,right.id]);
  }
  function open(id:string) {
    const node=graph.nodes.find(n=>n.id===id);
    if(!node) return;
    selectOnly(id);
    if(!historical && (node.isDraft || node.kind==='brief') && node.variantId) {
      if(node.variantId!==activeVariant) switchVariant(node.variantId);
      onStep(node.isDraft?'studio':'insight');
    }
  }
  async function removeReference(id:string) {
    try {await graph.removeReference(id);setMessage('已移除参考关系');}
    catch(e) {setError(e instanceof Error?e.message:'无法移除关联。');}
  }
  async function copyReference(node:WorkflowNode) {
    if(busy) return;
    setBusy(true);
    try {const id=await graph.copyHistoryImage(node.id);onBoard('project',id);}
    catch(e) {setError(e instanceof Error?e.message:'无法复制这张参考图。');}
    finally {setBusy(false);}
  }
  function generate() {
    onHandoff({generate:crypto.randomUUID()});
  }
  function openHandoff(node?:WorkflowNode) {
    if(node?.isDraft) generate();
    else onHandoff({attemptId:node?.attemptId,candidates:true});
  }
  if(!active) return null;
  return <section className="graph-workspace" aria-label="方案关系画布" data-testid="workflow-workspace" data-board-id={board}>
    <header className="graph-page-head">
      <div className="graph-heading"><div className="graph-headline"><h1>{historical?'B2 · 四旋翼外观深化':'方案关系画布'}</h1><LocalStatus board={board}/></div>
        {historical ? <p>从原始候选追踪相机安装位置的两条人工深化分支。</p> :
          <button className="canvas-goal-link" onClick={()=>onStep('insight')}><Target size={13}/>
            <span>{draft?.intent?.note || '设定设计目标'}</span><ArrowUpRight size={12}/>
          </button>}
      </div>
      <div className="graph-actions">
        {pictures.length>=2 && <button className="canvas-action" onClick={startCompare} data-testid="compare-images"><ArrowLeftRight size={15}/>图片对照</button>}
        {historical ? <button className="canvas-action primary" onClick={()=>onBoard('project')}>进入我的项目<ArrowUpRight size={15}/></button> : <>
          <details ref={toolsMenu} className="canvas-tools-menu" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.open=false;}}
            onKeyDown={event=>{if(event.key==='Escape' && toolsMenu.current){toolsMenu.current.open=false;toolsMenu.current.querySelector('summary')?.focus();}}}>
            <summary className="canvas-action">画布工具<ChevronDown size={13}/></summary>
            <div className="canvas-tools-list" onClick={()=>{if(toolsMenu.current)toolsMenu.current.open=false;}}>
              <button onClick={()=>upload.current?.click()}><ImagePlus size={15}/>添加参考图</button>
              <button aria-pressed={linkMode} onClick={()=>{setLinkMode(!linkMode);setLinkFrom(linkMode?null:selectedId);setError('');}}><Link2 size={15}/>连接参考</button>
              <button onClick={()=>draft && branch(draft.id)} disabled={!draft}><GitBranchPlus size={15}/>保存草稿版本</button>
            </div>
          </details>
          <button className="canvas-action" onClick={()=>onStep('studio')}><SlidersHorizontal size={15}/>调整参数</button>
          <button className="canvas-action primary" data-testid="canvas-generate" onClick={generate} disabled={!draft}><ScanLine size={15}/>生成候选图</button>
        </>}
      </div>
    </header>
    <input className="sr-only" ref={upload} type="file" accept="image/png,image/jpeg,image/webp" aria-label="导入参考图片" tabIndex={-1} onChange={async event=>{
      const file=event.currentTarget.files?.[0];event.currentTarget.value='';
      if(!file) return;
      try {const id=await graph.addImage(file);selectOnly(id);setMessage('参考图已加入画布');}
      catch(e) {setError(e instanceof Error?e.message:'图片导入失败。');}
    }}/>
    <div className={`graph-body ${panel && selected?'is-inspecting':''}`}>
      <div className="graph-stage">
        <GraphBoard nodes={graph.nodes} edges={graph.edges} boardId={board} selectedId={selectedId} onSelect={select} onOpen={open}
          onConnect={historical?undefined:(from,to)=>void connect(from,to)}/>
        {linkMode && <div className="graph-link-prompt"><Link2 size={14}/>{linkFrom?'点选要参考这项内容的目标节点':'点选提供参考的来源节点'}<button onClick={()=>{setLinkMode(false);setLinkFrom(null);}}>取消</button></div>}
        {(error || graph.error) && !modalNode && <div className="graph-feedback issue" role="alert">{error || graph.error}{error && <button aria-label="关闭提示" onClick={()=>setError('')}><X size={13}/></button>}</div>}
        {!error && message && <div className="graph-feedback" role="status"><Check size={14}/>{message}</div>}
        {graph.loading && graph.nodes.length===0 && <div role="status" className="graph-loading">正在读取本机设计记录…</div>}
      </div>
      {panel && selected && <aside className="graph-detail-panel">
        <div className="graph-detail-bar"><span>节点详情</span><button className="canvas-icon-button" onClick={()=>setPanel(false)} aria-label="收起节点详情"><PanelRightClose size={16}/></button></div>
        <GraphInspector node={selected} nodes={graph.nodes} edges={graph.edges} boardId={board} onSelect={selectOnly} onBranch={branch} onRestore={id=>void restore(id)}
          onRemoveReference={id=>void removeReference(id)} onCopyReference={node=>void copyReference(node)} onEdit={()=>onStep('studio')} onEditBrief={()=>onStep('insight')} onHandoff={openHandoff}
          onContinueCandidate={node=>onHandoff({attemptId:node.attemptId,parentCandidateId:node.candidateId,candidates:true})}/>
      </aside>}
    </div>
    <footer className="graph-status-bar">
      <span>{graph.nodes.length} 个节点<i/> {graph.edges.length} 条关系</span>
      {!historical && <div><button onClick={()=>openHandoff()}><ScanLine size={12}/>查看生成记录</button></div>}
    </footer>
    {compare && <CompareImages pictures={pictures} initial={compare} onClose={()=>setCompare(null)}/>}
    {modalNode && <dialog className="canvas-dialog branch-dialog" ref={dialog} onCancel={event=>{if(busy)event.preventDefault();else setModalNode(null);}} aria-labelledby="branch-title">
      <header><h2 id="branch-title">保存方案版本</h2><button disabled={busy} className="canvas-icon-button" onClick={()=>setModalNode(null)} aria-label="关闭"><X size={17}/></button></header>
      <form onSubmit={event=>{event.preventDefault();void saveBranch();}}>
        <p>来源 · {modalNode.title}</p><label>版本名称<input autoFocus value={branchName} maxLength={90} placeholder="例如，保留轴位，增加机身宽度" onChange={event=>setBranchName(event.target.value)}/></label>
        {error && <p role="alert">{error}</p>}<div><button type="button" disabled={busy} className="canvas-action" onClick={()=>setModalNode(null)}>取消</button><button className="canvas-action primary" disabled={busy}>{busy?'正在保存':'保存版本'}</button></div>
      </form>
    </dialog>}
  </section>;
}
