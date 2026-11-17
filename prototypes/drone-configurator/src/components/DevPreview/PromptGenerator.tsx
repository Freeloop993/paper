// 发给模型的文字：逐句列出并标明来源，刚改动的句子加亮；附模板自检和三件导出。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { openDecisions } from '../../design/fields';
import { auditPrompt, compilePrompt, diffSentences, sourceLabel, type SentenceSource } from '../../design/partPrompt';
import { buildExport, canvasPngBytes, download, exportAll, fileNames, fileStamp, guideCanvas, parseImported } from '../../design/exporters';
import { sha256Bytes } from '../../design/sha256';
import { Check, Copy, Download, FileJson, FileText, Image as ImageIcon, ShieldCheck, TriangleAlert, Upload } from 'lucide-react';

const sourceStyle: Record<SentenceSource, string> = {
  fixed: 'bg-slate-200 text-slate-700', default: 'bg-white text-slate-500 border border-slate-300', chosen: 'bg-primary-600 text-white',
  adopted: 'bg-emerald-600 text-white', custom: 'bg-violet-600 text-white',
};

const PromptGenerator: React.FC<{ autoScroll?: boolean }> = ({ autoScroll }) => {
  const { parameters, touched, intent, lastChange, pinned, importSnapshot, exportNote: note, setExportNote: setNote, notice: message, setNotice: setMessage } = useDroneStore();
  const [against, setAgainst] = useState<'last' | 'pinned'>('last');
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // 宽屏下提示词在自己的滚动区里：每次改动后把改写的那一句滚到眼前。
  useEffect(() => {
    if (!autoScroll || !lastChange) return;
    list.current?.querySelector('[data-changed="yes"], [data-changed="removed"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [autoScroll, lastChange]);

  const layout = useMemo(() => computeLayout(parameters), [parameters]);
  const prompt = useMemo(() => compilePrompt(parameters, touched, intent, layout), [parameters, touched, intent, layout]);
  const audit = useMemo(() => auditPrompt(parameters, prompt.sentences), [parameters, prompt]);
  const open = openDecisions(parameters);
  const usePinned = against === 'pinned' && pinned;
  const base = usePinned ? pinned : lastChange?.before ?? null;
  const diff = useMemo(() => {
    if (!base) return null;
    const before = compilePrompt(base.parameters, base.touched, base.intent, computeLayout(base.parameters)).sentences;
    return diffSentences(before, prompt.sentences);
  }, [base, prompt]);
  const changed = new Map(diff?.changed.map(c => [c.id, c.before]));
  const added = new Set(diff?.added);

  const state = { parameters, touched, intent };
  const options = { note, pinned, lastChange: lastChange && { path: lastChange.path, label: lastChange.label, from: lastChange.from, to: lastChange.to } };
  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt.text); } catch {
      const area = document.createElement('textarea'); area.value = prompt.text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  const one = (kind: 'config' | 'prompt' | 'guide') => {
    const stamp = fileStamp(), names = fileNames(stamp);
    const png = canvasPngBytes(guideCanvas(layout));
    const config = buildExport(state, { ...options, stamp, guideSha256: sha256Bytes(png) });
    if (kind === 'guide') download(names.guide, png, 'image/png');
    if (kind === 'prompt') download(names.prompt, config.prompt.text, 'text/plain;charset=utf-8');
    if (kind === 'config') download(names.config, JSON.stringify(config, null, 2), 'application/json');
    setMessage(`已导出 ${names[kind]}`);
  };
  const all = () => { const c = exportAll(state, options); setMessage(`已导出同一时间戳的三个文件：${c.files.guide}、${c.files.prompt}、${c.files.config}`); };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try { importSnapshot(parseImported(JSON.parse(await file.text()), parameters)); setMessage(`已读入 ${file.name}`); }
    catch (e) { setMessage('读入失败：' + (e instanceof Error ? e.message : String(e))); }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <section className="card !p-3 sm:!p-4" aria-label="发给模型的文字" data-testid="prompt-panel">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-slate-900">发给模型的文字</h2>
        <span className="text-xs text-slate-500">共 {prompt.sentences.length} 句 · 按固定顺序编译</span>
        <span className="ml-auto flex items-center gap-1 text-xs">
          <span className="text-slate-500">加亮：</span>
          <button type="button" onClick={() => setAgainst('last')} aria-pressed={against === 'last'}
            className={`rounded px-1.5 py-0.5 ${against === 'last' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-600'}`}>刚才的改动</button>
          <button type="button" onClick={() => setAgainst('pinned')} aria-pressed={against === 'pinned'} disabled={!pinned}
            className={`rounded px-1.5 py-0.5 disabled:opacity-40 ${against === 'pinned' ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-600'}`}>与对照相比</button>
        </span>
      </div>

      <ol className="space-y-1" data-testid="sentences" ref={list}>
        {prompt.sentences.map((s, i) => {
          const was = changed.get(s.id);
          const isNew = added.has(s.id);
          return (
            <li key={s.id} data-sentence={s.id} data-changed={was !== undefined || isNew ? 'yes' : 'no'}
              className={`rounded-md border px-2 py-1.5 text-[13px] leading-snug ${was !== undefined ? 'border-yellow-400 bg-yellow-50' : isNew ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="tabular-nums text-slate-400">{i + 1}</span>
                <span className={`rounded px-1.5 py-0.5 font-medium leading-none ${sourceStyle[s.source]}`}>{sourceLabel[s.source]}</span>
                <span className="text-slate-500">{s.zh}</span>
                {was !== undefined && <span className="rounded bg-yellow-300 px-1 font-medium text-yellow-900">改写</span>}
                {isNew && <span className="rounded bg-emerald-300 px-1 font-medium text-emerald-900">新增</span>}
              </div>
              {was !== undefined && <p className="font-mono text-slate-400 line-through">{was}</p>}
              <p className="font-mono text-slate-800">{s.text}</p>
            </li>
          );
        })}
        {diff?.removed.map(r => (
          <li key={r.id} data-sentence={r.id} data-changed="removed" className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1.5 text-[13px] leading-snug">
            <div className="mb-0.5 text-[11px]"><span className="rounded bg-rose-300 px-1 font-medium text-rose-900">已删去</span></div>
            <p className="font-mono text-slate-400 line-through">{r.before}</p>
          </li>
        ))}
      </ol>

      <div className="mt-2 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="open-note">
        <b className="font-medium">留白、未写入提示词的造型项（{open.length}）：</b>
        {open.length ? open.map(f => f.label).join('、') : '没有，全部已由你选定。'}
      </div>

      <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs" data-testid="audit">
        <div className="mb-1 flex items-center gap-1 font-medium text-slate-700"><ShieldCheck className="h-3.5 w-3.5" />模板自检：未选的东西有没有被加进文字</div>
        <ul className="grid gap-1 sm:grid-cols-3">
          {audit.map(a => (
            <li key={a.topic} data-audit={a.topic} data-status={a.status} className="flex items-start gap-1 text-slate-600">
              {a.status === 'unexpected' ? <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              <span><b className="font-medium text-slate-800">{a.label}</b>：{a.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">导出</h3>
          <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-slate-600">
            备注
            <input value={note} onChange={e => setNote(e.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none" />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={all} className="btn-primary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm" data-testid="export-all">
            <Download className="h-4 w-4" />一次导出三件
          </button>
          <button type="button" onClick={() => one('config')} className="btn-secondary inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-sm" data-testid="export-config"><FileJson className="h-4 w-4" />配置 JSON</button>
          <button type="button" onClick={() => one('prompt')} className="btn-secondary inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-sm" data-testid="export-prompt"><FileText className="h-4 w-4" />提示词</button>
          <button type="button" onClick={() => one('guide')} className="btn-secondary inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-sm" data-testid="export-guide"><ImageIcon className="h-4 w-4" />点线图 PNG</button>
          <button type="button" onClick={copy} className="btn-secondary inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-sm"><Copy className="h-4 w-4" />{copied ? '已复制' : '复制全文'}</button>
          <button type="button" onClick={() => fileInput.current?.click()} className="btn-secondary inline-flex items-center gap-1.5 !px-2.5 !py-1.5 text-sm"><Upload className="h-4 w-4" />读入配置</button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={e => onImport(e.target.files?.[0])} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          三件出自同一份状态：点线图（1024×1024，黑底红点蓝线，机头朝上）、提示词全文、配置 JSON（含轴心坐标、每项选择的状态、证据卡记录和提示词逐句来源）。
          模型服务停用，本页不生成图像；生成图上的读数须回图后另量。
        </p>
        {message && <p className="mt-1 text-xs font-medium text-emerald-700" role="status" data-testid="export-message">{message}</p>}
      </div>
    </section>
  );
};

export default PromptGenerator;
