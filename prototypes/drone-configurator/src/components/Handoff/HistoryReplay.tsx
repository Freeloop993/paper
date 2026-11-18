import { useEffect, useState } from 'react';
import cases from '../../data/history/cases.json';
import quadImage from '../../data/history/quad.webp';
import hexImage from '../../data/history/hex.webp';
import quadGuide from '../../data/history/quad-guide.png';
import hexGuide from '../../data/history/hex-guide.png';
import upperImage from '../../data/history/B2-upper.webp';
import lowerImage from '../../data/history/B2-lower.webp';

const root='https://github.com/Freeloop993/paper/tree/e96d41946ea84237da506bb76c2f713a3f3b9275/';
export default function HistoryReplay(){
  const [key,setKey]=useState<'quad'|'hex'|null>(null);
  useEffect(()=>{if(!key)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setKey(null);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[key]);
  const current=key?cases[key]:null;
  return <section className="panel p-4" aria-label="历史设计回放">
    <h3 className="mb-2 font-semibold">历史设计回放</h3>
    <div className="flex flex-wrap gap-2">{(['quad','hex'] as const).map(k=><button type="button" className={key===k?'btn-dark':'btn-ghost border border-line'} data-history-case={k} aria-expanded={key===k} key={k} onClick={()=>setKey(key===k?null:k)}>
      {k==='quad'?'四旋 · B2 父图与深化':'农业六旋 · 比例验证'}</button>)}</div>
    {key&&current&&<div className="mt-4 grid gap-4 md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)]" data-testid="history-replay">
      <figure><img className="w-full rounded-xl border border-line" src={key==='quad'?quadImage:hexImage} alt={key==='quad'?'原始四旋候选 B2 的预览':'农业六旋历史生成图的预览'}/><figcaption className="mt-1 text-xs text-ink-soft">{current.id} · 归档原图的缩略预览</figcaption></figure>
      <div className="space-y-3 text-sm"><h4 className="font-semibold">{key==='quad'?'日常航拍四旋 · 机鼻与相机的关系':'农业植保六旋 · 展开布局'}</h4>
        {key==='quad'?<><p>第三轮有 9 张候选。作者初评时将父图栏留空，希望修改 B2 看似内嵌的相机。明确三个方向的用途后，作者选 B2 作父图。后续回合用 B2 作输入、C1 作辅助参考。作者随后回到 B2，通过人工合成比较相机位置，倾向下端安装。</p>
          <div className="grid grid-cols-2 gap-2">{[[upperImage,'相机在上端'],[lowerImage,'相机在下端']].map(([s,t])=><figure key={t}><img className="w-full rounded-lg border border-line" src={s} alt={t+'的人工对照图'}/><figcaption className="text-xs">{t} · 人工合成</figcaption></figure>)}</div></>:
        <p>本案为更正批的比例样本。旧运行 P2-HEXA-wl1.00-r01 单独归档，实验者更正负向提示词及输出名，保留原种子重跑。目标归一化比值为 1.00，独立 AI 读数为 0.9462。档案保存了执行记录；作者选择、首次看图时间与真人评议均未登记。</p>}
        <details className="rounded-lg bg-paper p-3"><summary className="cursor-pointer font-medium">查看冻结输入与服务回执</summary>
          <figure className="mt-2"><img className="h-28 w-28 rounded-lg" src={key==='quad'?quadGuide:hexGuide} alt={key==='quad'?'归档的四轴条件图':'归档的六轴条件图'}/><figcaption className="mt-1 text-xs">模型实际收到的布局条件图</figcaption></figure>
          <dl className="mt-2 space-y-2 break-all text-xs">{[['作业号',current.jobId],['种子',current.seed],['输入图',current.guide],['输入图 SHA-256',current.guideHash],['实发请求 SHA-256',current.requestHash],['回图 SHA-256',current.imageHash]].map(([k,v])=><div key={k}><dt className="text-ink-soft">{k}</dt><dd className="font-mono">{v}</dd></div>)}</dl>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs" lang="en">{current.prompt}</p></details>
        <a target="_blank" rel="noreferrer" className="text-primary-700 underline" href={root+(key==='quad'?'evidence/e3-quad-qwen-20261115/round-3':'evidence/gpu-day-20261115/dual-hexa-handoff')}>查看归档原件</a>
      </div></div>}
  </section>;
}
