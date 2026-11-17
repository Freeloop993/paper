// 页签里共用的控件：状态标签、选项组、带数值微调的滑块、可留白的造型选择。
import React from 'react';
import { Eye, EyeOff, Type, X } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { fieldByPath, fieldStatus, getPath, statusLabel, visibilityLabel, type FieldStatus, type Option, type Visibility } from '../../design/fields';

const statusStyle: Record<FieldStatus, string> = {
  fixed: 'bg-slate-200 text-slate-700 border-slate-300',
  default: 'bg-white text-slate-500 border-slate-300',
  chosen: 'bg-primary-600 text-white border-primary-600',
  open: 'bg-amber-50 text-amber-800 border-amber-400 border-dashed',
};
export const StatusChip: React.FC<{ status: FieldStatus; className?: string }> = ({ status, className = '' }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none ${statusStyle[status]} ${className}`}>
    {statusLabel[status]}
  </span>
);

const visIcon: Record<Visibility, React.ReactNode> = {
  top: <Eye className="h-3 w-3" />, text: <Type className="h-3 w-3" />, occluded: <EyeOff className="h-3 w-3" />,
};
export const VisibilityTag: React.FC<{ visibility: Visibility }> = ({ visibility }) => (
  <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] text-slate-500" title={
    visibility === 'top' ? '顶视图中看得见，示意图已画出' : visibility === 'text' ? '示意图不画，只写进提示词' : '顶视图中被遮挡，见侧视示意'
  }>
    {visIcon[visibility]}{visibilityLabel[visibility]}
  </span>
);

/** 一行参数：名称、当前状态、顶视可见性、清除按钮，下面放控件。刚改动的一行会加亮。 */
export const Field: React.FC<{ path: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ path, hint, children }) => {
  const { parameters, touched, lastChange, clearField } = useDroneStore();
  const def = fieldByPath[path];
  const status = fieldStatus(def, parameters, touched);
  const fresh = lastChange?.path.split('#')[0] === path;
  return (
    <div data-field={path} className={`rounded-lg border p-3 ${fresh ? 'border-primary-500 bg-primary-50/60' : 'border-slate-200 bg-white'}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium text-slate-800">{def.label}</span>
        <span className="text-sm tabular-nums text-slate-600">{def.format(parameters)}</span>
        <span className="ml-auto flex items-center gap-2">
          <VisibilityTag visibility={def.visibility} />
          <StatusChip status={status} />
          {status === 'chosen' && def.kind !== 'custom' && (
            <button type="button" onClick={() => clearField(path)} title={def.kind === 'styling' ? '清除，改回留白' : '清除，改回默认值'}
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <X className="h-3 w-3" />清除
            </button>
          )}
        </span>
      </div>
      {children}
      {hint && <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
};

export function Segmented<T extends string>({ options, value, onChange, columns }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; columns?: number;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }} role="radiogroup">
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-md border px-2 py-1.5 text-left text-sm ${value === o.value
            ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-primary-500'}`}>
          <span className="block font-medium">{o.zh}</span>
          {o.hint && <span className={`block text-[11px] leading-snug ${value === o.value ? 'text-primary-50' : 'text-slate-500'}`}>{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

/** 造型选择：第一项永远是“留白”，由设计者后续决定；选了具体项才会写进提示词。 */
export function OpenChoice<T extends string>({ path, options, columns }: { path: string; options: Option<T>[]; columns?: number }) {
  const { parameters, setField } = useDroneStore();
  const value = getPath(parameters, path) as T | '';
  const all = [{ value: '' as T | '', zh: '留白', hint: '设计者后续决定' }, ...options] as Option<T | ''>[];
  return <Segmented options={all} value={value} onChange={v => setField(path, v)} columns={columns ?? Math.min(all.length, 4)} />;
}

export interface Mark { v: number; label: string; kind: 'experimental' | 'measured' | 'published' | 'study' }
const markStyle: Record<Mark['kind'], string> = {
  experimental: 'bg-violet-500', measured: 'bg-emerald-500', published: 'bg-slate-500', study: 'bg-violet-500',
};
const markKindLabel: Record<Mark['kind'], string> = { experimental: '实验档位', measured: '手册图面量测', published: '厂商公布', study: '实验设定' };

/** 滑块 + 数值微调。刻度下方可标出实验档位、厂商公布值和图面量测值，点一下刻度只是把滑块移过去。 */
export const SliderField: React.FC<{
  path: string; min: number; max: number; step: number; unit: string; marks?: Mark[]; disabled?: boolean; digits?: number;
}> = ({ path, min, max, step, unit, marks = [], disabled, digits = 0 }) => {
  const { parameters, setField } = useDroneStore();
  const value = getPath(parameters, path) as number;
  const clamp = (v: number) => Number(Math.min(max, Math.max(min, v)).toFixed(digits + 2));
  const set = (v: number) => { if (Number.isFinite(v)) setField(path, clamp(v)); };
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const shown = marks.filter(m => m.v >= min && m.v <= max).sort((a, b) => a.v - b.v);
  // 相邻刻度太近时只留刻度线，数值在下方图例里完整列出。
  let lastLabel = -Infinity;
  const labelled = shown.map(m => { const ok = pct(m.v) - lastLabel >= 11; if (ok) lastLabel = pct(m.v); return ok; });
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-center gap-2">
        <button type="button" disabled={disabled} onClick={() => set(value - step)} aria-label="减小"
          className="h-8 w-8 shrink-0 rounded-md border border-slate-300 text-slate-700 hover:border-primary-500 disabled:cursor-not-allowed">−</button>
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => set(Number(e.target.value))}
          aria-label={fieldByPath[path].label} className="slider h-2 w-full min-w-0 flex-1" />
        <button type="button" disabled={disabled} onClick={() => set(value + step)} aria-label="增大"
          className="h-8 w-8 shrink-0 rounded-md border border-slate-300 text-slate-700 hover:border-primary-500 disabled:cursor-not-allowed">+</button>
        <label className="flex shrink-0 items-center gap-1 text-sm text-slate-600">
          <input type="number" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => set(Number(e.target.value))}
            className="w-[4.5rem] rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums focus:border-primary-500 focus:outline-none" />
          {unit}
        </label>
      </div>
      {shown.length > 0 && (
        <div className="relative mx-10 mt-1 h-7">
          {shown.map((m, i) => (
            <button key={m.label + i} type="button" disabled={disabled} onClick={() => set(m.v)} title={`${markKindLabel[m.kind]}：${m.label} ${m.v}`}
              className="group absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(m.v) + '%' }}>
              <span className={`mx-auto block h-2 w-0.5 ${markStyle[m.kind]}`} />
              {labelled[i] && <span className="block whitespace-nowrap text-[10px] leading-tight text-slate-500 group-hover:text-slate-900">{m.v}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const MarkLegend: React.FC<{ marks: Mark[] }> = ({ marks }) => (
  <ul className="mt-0.5 space-y-0.5 text-[11px] leading-snug text-slate-500">
    {(['experimental', 'study', 'published', 'measured'] as const).filter(k => marks.some(m => m.kind === k)).map(k => (
      <li key={k}>
        <span className={`mr-1 inline-block h-2 w-0.5 align-middle ${markStyle[k]}`} />
        <b className="font-medium text-slate-600">{markKindLabel[k]}：</b>
        {marks.filter(m => m.kind === k).map(m => `${m.label} ${m.v}`).join('、')}
      </li>
    ))}
  </ul>
);

export const TabIntro: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{children}</p>
  </div>
);
