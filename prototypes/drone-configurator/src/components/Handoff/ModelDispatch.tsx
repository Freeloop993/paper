import { useState } from 'react';
import { Download, Send } from 'lucide-react';
import type { FrozenAttempt } from '../../design/candidateRecords';
import { attachReceipt, recordDispatch, recordRunFailure } from '../../design/candidateRecords';
import { compileModelRequest, jobId, modelImageName, readModelOutputs, sendModelRequest, serverAddress, uploadModelImage } from '../../design/modelRequest';
import { download } from '../../design/exporters';

const messageOf = (error:unknown) => error instanceof Error ? error.message : String(error);

/** One explicit submission per frozen attempt. All later actions only retrieve the same run. */
export default function ModelDispatch({attempt}: {attempt:FrozenAttempt}) {
  const [address,setAddress] = useState(attempt.dispatch?.server ?? '');
  const [seed,setSeed] = useState('1');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const sent = attempt.dispatch;
  const attachments = [
    ...(attempt.condition === 'structured' ? [{label:'条件图',file:attempt.guide}] : []),
    ...(attempt.parentImage ? [{label:'父图',file:attempt.parentImage}] : []),
  ];

  async function localRequest() {
    try {
      if (!sent && (!/^\d+$/.test(seed) || !Number.isSafeInteger(Number(seed)))) throw new Error('请输入有效的非负整数种子。');
      const request=sent?.request ?? compileModelRequest(attempt.id,attempt.confirmedText,Number(seed),
        await Promise.all(attachments.map(a=>modelImageName(a.file))));
      download('studio-'+attempt.id+'.request.json',request,'application/json');
      setMessage('已导出请求原件。外部运行时，按请求内的名称载入输入图。');
    } catch (error) {setMessage(messageOf(error));}
  }

  async function submit() {
    if (busy || sent) return;
    setBusy(true);
    let sealed: Blob|undefined;
    let endpoint = '';
    let acknowledged: Blob|undefined;
    try {
      endpoint = serverAddress(address);
      if (!/^\d+$/.test(seed) || !Number.isSafeInteger(Number(seed))) throw new Error('请输入有效的非负整数种子。');
      const inputs:string[] = [];
      for (const item of attachments) inputs.push(await uploadModelImage(endpoint,item.file));
      const request = compileModelRequest(attempt.id,attempt.confirmedText,Number(seed),inputs);
      await recordDispatch(attempt.id,request,undefined,undefined,endpoint);
      sealed=request;
      acknowledged=await sendModelRequest(endpoint,request);
      const id=await jobId(acknowledged);
      await recordDispatch(attempt.id,request,acknowledged,undefined,endpoint);
      setMessage('已入队 · '+id);
    } catch (error) {
      const detail=messageOf(error);
      if (sealed) {
        try { await recordDispatch(attempt.id,sealed,acknowledged,detail,endpoint); }
        catch (saving) { setMessage(detail+'。保存回执失败：'+messageOf(saving));return; }
      }
      setMessage(sealed?'已留存请求，请核对后端记录。'+detail:detail);
    } finally { setBusy(false); }
  }

  async function collect() {
    if (busy || !sent?.ack || !sent.server) return;
    setBusy(true);
    try {
      const id=await jobId(sent.ack);
      const outputs=await readModelOutputs(sent.server,id);
      if (!outputs) {setMessage('尚未收到完成记录，可稍后再查询。');return;}
      if (outputs.failed) {
        await recordRunFailure(attempt.id,outputs.history);
        setMessage('后端报告运行失败，已保存原始历史记录。');return;
      }
      await attachReceipt(attempt.id,sent.request,sent.ack,outputs.history,outputs.files);
      setMessage('已核对并载入 '+outputs.files.length+' 张候选图。');
    } catch (error) {setMessage(messageOf(error));}
    finally {setBusy(false);}
  }

  return <details className="mt-3 rounded-xl border border-line bg-white px-4 py-3" data-testid="model-dispatch">
    <summary className="cursor-pointer text-sm font-semibold text-ink">模型提交与外部运行文件</summary>
    <p className="my-2 text-xs leading-relaxed text-ink-soft">使用支持 Qwen Image 2.1 的 ComfyUI。可以连接服务提交，也可以下载文件交给主持人运行。</p>
    <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
      <label className="text-xs text-ink-soft">服务地址<input value={sent?.server ?? address} disabled={!!sent || busy}
        onChange={e=>setAddress(e.target.value)} placeholder="http://127.0.0.1:8188" type="url" data-testid="model-url"
        className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm text-ink" /></label>
      {!sent && <label className="text-xs text-ink-soft">随机种子<input value={seed} disabled={busy} inputMode="numeric"
        onChange={e=>setSeed(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-sm text-ink" /></label>}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {!sent && <button type="button" className="btn-dark" disabled={busy || !address.trim()} onClick={submit} data-testid="model-submit"><Send size={14}/>提交已确认输入</button>}
      {sent?.ack && <button type="button" className="btn-ghost" disabled={busy} onClick={collect} data-testid="model-collect"><Download size={14}/>查询回图</button>}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="btn-line" onClick={localRequest} data-testid="model-request-download">下载请求 JSON</button>
      {attachments.map(a=><button type="button" className="btn-line" key={a.label} onClick={async()=>{
        try { download(await modelImageName(a.file),a.file,'image/png'); } catch (e) {setMessage(messageOf(e));}
      }}>下载{a.label} PNG</button>)}
    </div>
    <p aria-live="polite" className="mt-2 break-words text-xs text-ink-soft">{busy?'正在处理…':message || sent?.error || (sent ? (sent.ack?'已保存服务回执。':'请求已封存，服务入队状态待核对。'):'')}</p>
  </details>;
}
