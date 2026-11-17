// 设计提示：把无人机设计里的几条常识算成当前方案的具体提醒（俯视近似，只作提示）。
import React from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { designHints } from '../../design/checks';
import type { Layout } from '../../design/design';
import type { DroneParameters, ParameterGroup } from '../../types/DroneParameters';

const icon = {
  ok: <CircleCheck className="h-4 w-4 text-emerald-600" />,
  note: <Info className="h-4 w-4 text-ink-faint" />,
  warn: <CircleAlert className="h-4 w-4 text-signal-600" />,
};

const Hints: React.FC<{ parameters: DroneParameters; layout: Layout; onSelect: (g: ParameterGroup) => void }> = ({ parameters, layout, onSelect }) => (
  <section className="panel p-4" aria-label="设计提示" data-testid="hints">
    <div className="flex items-baseline gap-2">
      <h3 className="panel-title">设计提示</h3>
      <span className="eyebrow">Checks</span>
    </div>
    <ul className="mt-2 space-y-2">
      {designHints(parameters, layout).map(h => (
        <li key={h.id} data-hint={h.id} data-level={h.level}>
          <button type="button" onClick={() => onSelect(h.group)} className="flex w-full gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-canvas">
            <span className="mt-0.5 shrink-0">{icon[h.level]}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">{h.title}</span>
              <span className="block text-xs leading-relaxed text-ink-soft">{h.text}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

export default Hints;
