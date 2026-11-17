// 部件面板里共用的控件。一行一个参数：名称在左、当前值在右；说明尽量短，参考数值收进 ⓘ。
import React, { useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { fieldByPath, fieldStatus, getPath, type Option } from '../../design/fields';

export const Field: React.FC<{
  path: string; en?: string; value?: React.ReactNode; hint?: React.ReactNode; reference?: React.ReactNode; children: React.ReactNode;
}> = ({ path, en, value, hint, reference, children }) => {
  const { parameters, touched, clearField } = useDroneStore();
  const [open, setOpen] = useState(false);
  const def = fieldByPath[path];
  const changed = fieldStatus(def, parameters, touched) === 'chosen' && def.kind !== 'custom';
  return (
    <div data-field={path} className="space-y-2">
      <div className="flex items-baseline gap-x-2">
        <span className="text-[13px] font-medium text-ink">{def.label}</span>
        {en && <span className="eyebrow hidden sm:inline">{en}</span>}
        {reference && (
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} title="真实机型与实验档的参考数值"
            className={`inline-flex translate-y-0.5 items-center ${open ? 'text-primary-600' : 'text-ink-faint hover:text-primary-600'}`}><Info className="h-3.5 w-3.5" /></button>
        )}
        <span className="ml-auto flex items-baseline gap-2">
          {changed && (
            <button type="button" onClick={() => clearField(path)} title="改回默认" className="inline-flex items-center gap-1 text-[11px] text-ink-faint hover:text-primary-600">
              <RotateCcw className="h-3 w-3" />重置
            </button>
          )}
          {value !== undefined && <span className="text-[13px] font-semibold tabular-nums text-ink" data-value>{value}</span>}
        </span>
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-ink-soft">{hint}</p>}
      {open && reference && <div className="rounded-xl bg-canvas px-3 py-2 text-xs leading-relaxed text-ink-soft">{reference}</div>}
    </div>
  );
};

/** 一组并排的选项。已选的具体项是墨色实底；“不指定”被选中时只是浅灰虚框，不会看起来像做了决定。 */
export function Choice<T extends string>({ options, value, onChange, label }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  // 按最长的选项文字估算每格最小宽度：四个短选项排成一行，长选项自动少排几列。
  const widest = Math.max(...options.map(o => [...o.zh].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 13 : 7.5), 24)));
  const min = options.some(o => o.hint) ? '9rem' : `${Math.ceil(widest)}px`;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const active = value === o.value, open = o.value === '';
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} data-option={o.value} onClick={() => onChange(o.value)}
            className={`rounded-xl border px-2.5 py-1.5 text-[13px] transition-colors ${o.hint ? 'text-left' : 'text-center'} ${active
              ? open ? 'border-dashed border-ink/30 bg-ink/[0.04] text-ink-soft' : 'border-ink bg-ink text-white'
              : 'border-line bg-white text-ink hover:border-ink/40'}`}>
            <span className="block whitespace-nowrap">{o.zh}</span>
            {o.hint && <span className={`block text-[11px] leading-snug ${active && !open ? 'text-white/70' : 'text-ink-faint'}`}>{o.hint}</span>}
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

/** 滑块，右侧数字框用于微调；下面可带几个一点即到的常用值。 */
export const Slider: React.FC<{
  path: string; min: number; max: number; step: number; unit: string; digits?: number; presets?: { v: number; label: string }[];
}> = ({ path, min, max, step, unit, digits = 0, presets = [] }) => {
  const { parameters, setField } = useDroneStore();
  const value = getPath(parameters, path) as number;
  const set = (v: number) => { if (Number.isFinite(v)) setField(path, Number(Math.min(max, Math.max(min, v)).toFixed(digits + 2))); };
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} aria-label={fieldByPath[path].label} className="slider min-w-0 flex-1" />
        <label className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white pr-2 focus-within:border-primary-500">
          <input type="number" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} aria-label={fieldByPath[path].label + '（数值）'}
            className="num w-14 rounded-lg bg-transparent py-1 pl-2 text-right text-[13px] focus:outline-none" />
          <span className="text-[11px] text-ink-faint">{unit}</span>
        </label>
      </div>
      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map(p => {
            const active = Math.abs(value - p.v) < step / 2;
            return (
              <button key={p.label} type="button" onClick={() => set(p.v)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${active ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-line text-ink-soft hover:border-ink/40'}`}>{p.label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TabHeading: React.FC<{ icon?: React.ReactNode; title: string; en: string; children?: React.ReactNode }> = ({ title, en, children }) => (
  <div>
    <div className="flex items-baseline gap-2">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <span className="eyebrow">{en}</span>
    </div>
    {children && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{children}</p>}
  </div>
);

/** 面板内的小分组，例如“造型（可以不指定）”。 */
export const Group: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <div className="space-y-4 border-t border-line pt-4">
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
      {note && <span className="text-[11px] text-ink-faint">{note}</span>}
    </div>
    {children}
  </div>
);
