// 当前选择：按五个页签列出每一项的值和状态，并把仍然留白的造型决定单独列在最上面。
import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { computeLayout } from '../../design/design';
import { diffParameters, fields, fieldStatus, groupLabel, isRelevant, openDecisions, taskFixed } from '../../design/fields';
import { StatusChip, VisibilityTag } from '../controls/controls';
import type { ParameterGroup } from '../../types/DroneParameters';
import { CircleDashed, GitCompareArrows, X } from 'lucide-react';

const groups: ParameterGroup[] = ['frame', 'propulsion', 'fuselage', 'landing_gear', 'accessories'];

const ParameterOverview: React.FC<{ onJump: (group: ParameterGroup, path: string) => void }> = ({ onJump }) => {
  const { parameters, touched, pinned, clearField, lastChange, unpin } = useDroneStore();
  const open = openDecisions(parameters);
  const chosen = fields.filter(f => isRelevant(f, parameters) && fieldStatus(f, parameters, touched) === 'chosen').length;
  const fresh = lastChange?.path.split('#')[0];
  const now = computeLayout(parameters);
  const was = pinned ? computeLayout(pinned.parameters) : null;
  // W/L 的前后值在下面的读数行里统一列出，这里不重复。
  const diff = pinned ? diffParameters(pinned.parameters, parameters).filter(d => d.path !== 'frame.span_ratio_wl') : [];
  return (
    <div className="space-y-3">
      <section className="card !p-3 sm:!p-4" aria-label="仍待决定的造型" data-testid="open-decisions">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900"><CircleDashed className="h-4 w-4 text-amber-600" />仍待决定的造型（{open.length}）</h2>
        <p className="mt-0.5 text-xs text-slate-500">这些由设计者后续决定，现在不会写进提示词。点一下可去对应页签。</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {open.length === 0 && <span className="text-xs text-slate-600">全部造型项都已选定。</span>}
          {open.map(f => (
            <button key={f.path} type="button" onClick={() => onJump(f.group, f.path)}
              className="rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100">
              {groupLabel[f.group]} · {f.label}
            </button>
          ))}
        </div>
      </section>

      {pinned && was && (
        <section className="card !p-3 sm:!p-4" aria-label="与对照比较" data-testid="compare">
          <div className="flex items-center gap-1.5">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900"><GitCompareArrows className="h-4 w-4 text-amber-600" />与对照比较</h2>
            <button type="button" onClick={unpin} className="ml-auto inline-flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800"><X className="h-3 w-3" />取消对照</button>
          </div>
          <table className="mt-2 w-full text-xs">
            <thead><tr className="text-left text-slate-500"><th className="py-1 font-normal">项目</th><th className="py-1 font-normal">对照「{pinned.label}」</th><th className="py-1 font-normal">当前</th></tr></thead>
            <tbody className="tabular-nums text-slate-800">
              {diff.length === 0 && <tr><td colSpan={3} className="py-1 text-slate-500">参数与对照相同。改一项试试。</td></tr>}
              {diff.map(d => <tr key={d.path} className="border-t border-slate-100"><td className="py-1 pr-2">{d.label}</td><td className="py-1 pr-2 text-slate-500">{d.from}</td><td className="py-1 font-medium">{d.to}</td></tr>)}
              {([
                ['W/L', was.W_over_L.toFixed(2), now.W_over_L.toFixed(2)],
                ['W × L（mm）', `${was.W_mm.toFixed(1)} × ${was.L_mm.toFixed(1)}`, `${now.W_mm.toFixed(1)} × ${now.L_mm.toFixed(1)}`],
                ['D 均值／最大两轴距', `${was.D_mean_mm.toFixed(1)}／${was.max_pair_mm.toFixed(1)}`, `${now.D_mean_mm.toFixed(1)}／${now.max_pair_mm.toFixed(1)}`],
                ['相邻夹角', was.adjacent_deg.map(a => a.toFixed(0)).join('·'), now.adjacent_deg.map(a => a.toFixed(0)).join('·')],
                ['d/D', was.d_over_D_mean.toFixed(2), now.d_over_D_mean.toFixed(2)],
                ['机身宽/D', was.body_width_over_D.toFixed(3), now.body_width_over_D.toFixed(3)],
              ] as const).map(([label, a, b]) => (
                <tr key={label} className={`border-t border-slate-100 ${a !== b ? '' : 'text-slate-400'}`}><td className="py-1 pr-2">{label}</td><td className="py-1 pr-2">{a}</td><td className={`py-1 ${a !== b ? 'font-medium' : ''}`}>{b}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-slate-500">示意图里橙色虚线是对照方案的轴心；提示词面板可切到“与对照相比”逐句看差别。</p>
        </section>
      )}

      <section className="card !p-3 sm:!p-4" aria-label="当前选择" data-testid="selection">
        <h2 className="text-base font-semibold text-slate-900">当前选择</h2>
        <p className="mt-0.5 text-xs text-slate-500">你选定 {chosen} 项，留白 {open.length} 项，其余为默认值或任务固定。</p>

        <h3 className="mt-3 text-xs font-semibold text-slate-500">任务固定</h3>
        <ul className="mt-1 space-y-1">
          {taskFixed.map(t => (
            <li key={t.label} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-slate-500">{t.label}</span><span className="min-w-0 flex-1 text-slate-800">{t.value}</span><StatusChip status="fixed" />
            </li>
          ))}
        </ul>

        {groups.map(g => (
          <div key={g}>
            <h3 className="mt-3 text-xs font-semibold text-slate-500">{groupLabel[g]}</h3>
            <ul className="mt-1 space-y-0.5">
              {fields.filter(f => f.group === g && isRelevant(f, parameters)).map(f => {
                const status = fieldStatus(f, parameters, touched);
                return (
                  <li key={f.path} data-row={f.path} data-status={status}
                    className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-xs ${fresh === f.path ? 'bg-primary-50 ring-1 ring-primary-500' : ''}`}>
                    <button type="button" onClick={() => onJump(f.group, f.path)} className="w-[6.5rem] shrink-0 truncate text-left text-slate-500 hover:text-primary-700 hover:underline">{f.label}</button>
                    <span className={`min-w-0 flex-1 truncate ${status === 'open' ? 'text-amber-800' : 'text-slate-800'}`} title={f.format(parameters)}>{f.format(parameters)}</span>
                    <span className="hidden sm:inline"><VisibilityTag visibility={f.visibility} /></span>
                    <StatusChip status={status} />
                    {status === 'chosen' && f.kind !== 'custom'
                      ? <button type="button" onClick={() => clearField(f.path)} title="清除这一项" aria-label={`清除${f.label}`} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><X className="h-3 w-3" /></button>
                      : <span className="w-4" />}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
};

export default ParameterOverview;
