import React from 'react';
import { RefreshCw, Undo2 } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { APP_VERSION } from '../../design/exporters';

export type Step = 'insight' | 'studio' | 'handoff';
export const steps: { id: Step; n: number; label: string; en: string }[] = [
  { id: 'insight', n: 1, label: '洞察', en: 'Insight' },
  { id: 'studio', n: 2, label: '造型', en: 'Studio' },
  { id: 'handoff', n: 3, label: '交付', en: 'Handoff' },
];

const Mark: React.FC = () => (
  <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="#0b1220" />
    <path d="M9 9 L23 23 M23 9 L9 23" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    {[[9, 9], [23, 9], [23, 23], [9, 23]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#ff6a1a" />)}
    <rect x="12.5" y="11.5" width="7" height="9" rx="2.4" fill="#fff" />
  </svg>
);

const TopBar: React.FC<{ step: Step; onStep: (s: Step) => void }> = ({ step, onStep }) => {
  const { undo, history, resetToDefaults } = useDroneStore();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
      <div className="flex h-[3.25rem] items-center gap-3 px-3 sm:px-4">
        <Mark />
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-[15px] font-semibold leading-tight text-ink">多旋翼造型工作台</div>
          <div className="eyebrow leading-tight">Parametric form studio · v{APP_VERSION}</div>
        </div>

        <nav className="mx-auto flex items-center gap-1 rounded-full border border-line bg-canvas p-1" aria-label="流程">
          {steps.map(s => (
            <button key={s.id} type="button" onClick={() => onStep(s.id)} aria-current={step === s.id ? 'step' : undefined} data-step={s.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors sm:px-4 ${step === s.id ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'}`}>
              <span className={`num text-[11px] ${step === s.id ? 'text-white/60' : 'text-ink-faint'}`}>{s.n}</span>{s.label}
              <span className={`hidden text-[11px] font-normal lg:inline ${step === s.id ? 'text-white/60' : 'text-ink-faint'}`}>{s.en}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!history.length} data-testid="undo" title="撤销上一步" className="btn-ghost !px-2 disabled:opacity-30"><Undo2 className="h-4 w-4" /><span className="hidden md:inline">撤销</span></button>
          <button type="button" onClick={resetToDefaults} data-testid="reset" title="把当前方案恢复为默认" className="btn-ghost !px-2"><RefreshCw className="h-4 w-4" /><span className="hidden md:inline">重置</span></button>
          <span className="ml-1 hidden rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-soft lg:inline" title="语义依据来自本地公开卡表；候选由外部模型返回">外部出图</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
