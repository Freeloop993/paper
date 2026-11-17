// 页签里共用的控件。原则：一行一个参数，名称在左、当前值在右；说明文字尽量短，细节收进“参考”里。
import React, { useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { fieldByPath, fieldStatus, getPath, type Option } from '../../design/fields';

/** 一个参数：名称、英文名、当前值；改过的参数旁边出现“重置”。 */
export const Field: React.FC<{
  path: string; en?: string; value?: React.ReactNode; hint?: React.ReactNode; reference?: React.ReactNode; children: React.ReactNode;
}> = ({ path, en, value, hint, reference, children }) => {
  const { parameters, touched, clearField } = useDroneStore();
  const [open, setOpen] = useState(false);
  const def = fieldByPath[path];
  const changed = fieldStatus(def, parameters, touched) === 'chosen' && def.kind !== 'custom';
  return (
    <div data-field={path} className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium text-slate-700">{def.label}</span>
        {en && <span className="text-sm text-slate-400">({en})</span>}
        {reference && (
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} title="参考数值"
            className="inline-flex translate-y-0.5 items-center text-slate-400 hover:text-primary-600"><Info className="h-4 w-4" /></button>
        )}
        <span className="ml-auto flex items-baseline gap-3">
          {changed && (
            <button type="button" onClick={() => clearField(path)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary-600">
              <RotateCcw className="h-3 w-3" />重置
            </button>
          )}
          {value !== undefined && <span className="text-sm font-semibold tabular-nums text-slate-900" data-value>{value}</span>}
        </span>
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}
      {open && reference && <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{reference}</div>}
    </div>
  );
};

/** 一组并排的选项按钮。按可用宽度自动排列：桌面上一行排开，手机上自动折成两三列。 */
export function Choice<T extends string>({ options, value, onChange, label }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  const min = options.some(o => o.hint) ? '9.5rem' : '5.25rem';
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} data-option={o.value} onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-2 text-sm ${o.hint ? 'text-left' : 'text-center'} ${active
              ? 'border-primary-600 bg-primary-50 font-medium text-primary-700 ring-1 ring-primary-600'
              : 'border-slate-300 bg-white text-slate-700 hover:border-primary-500 hover:bg-slate-50'}`}>
            <span className="block whitespace-nowrap">{o.zh}</span>
            {o.hint && <span className={`block text-xs font-normal ${active ? 'text-primary-600' : 'text-slate-500'}`}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** 造型选择：第一项是“不指定”，把这一处留给设计者后续决定；选了具体项才会写进提示词。 */
export function OpenChoice<T extends string>({ path, options }: { path: string; options: Option<T>[] }) {
  const { parameters, setField } = useDroneStore();
  const value = getPath(parameters, path) as T | '';
  const all = [{ value: '' as T | '', zh: '不指定' }, ...options] as Option<T | ''>[];
  return <Choice options={all} value={value} onChange={v => setField(path, v)} label={fieldByPath[path].label} />;
}

/** 滑块，下方是两端数值；右侧数字框用于微调；可带几个一点即到的常用值。 */
export const Slider: React.FC<{
  path: string; min: number; max: number; step: number; unit: string; digits?: number;
  presets?: { v: number; label: string }[];
}> = ({ path, min, max, step, unit, digits = 0, presets = [] }) => {
  const { parameters, setField } = useDroneStore();
  const value = getPath(parameters, path) as number;
  const set = (v: number) => { if (Number.isFinite(v)) setField(path, Number(Math.min(max, Math.max(min, v)).toFixed(digits + 2))); };
  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))}
          aria-label={fieldByPath[path].label} className="slider h-2 min-w-0 flex-1" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} aria-label={fieldByPath[path].label + '（数值）'}
          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
      </div>
      <div className="mt-1 flex justify-between pr-[5.75rem] text-xs text-slate-400"><span>{min}{unit}</span><span>{max}{unit}</span></div>
      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {presets.map(p => {
            const active = Math.abs(value - p.v) < step / 2;
            return (
              <button key={p.label} type="button" onClick={() => set(p.v)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-600 hover:border-primary-500'}`}>
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TabHeading: React.FC<{ icon: React.ReactNode; title: string; en: string; children?: React.ReactNode }> = ({ icon, title, en, children }) => (
  <div>
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <span className="text-sm text-slate-400">{en}</span>
    </div>
    {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
  </div>
);

/** 页签内的小分组：上半是尺寸与构型，下半是“造型（可不指定）”。 */
export const Group: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <div className="space-y-5 border-t border-slate-200 pt-5">
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
    {children}
  </div>
);
