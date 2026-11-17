// 参考机型：仓库里已核的真实航拍四旋。可以把某一款的电机布局叠到画布上对比，或直接套用它的比例。
import React from 'react';
import { Layers, Wand2 } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { aircraft, aircraftNote, aircraftParameters, ddOf, type Aircraft } from '../../data/aircraft';

const References: React.FC = () => {
  const { parameters, pinned, setGhost, setField, setMany } = useDroneStore();
  const apply = (a: Aircraft) => {
    const p = aircraftParameters(a, parameters);
    setField('frame.frame_type', 'Wide X');
    setMany([['frame.span_ratio_wl', Number(p.frame.span_ratio_wl.toFixed(2))], ['frame.wheelbase_mm', p.frame.wheelbase_mm], ['propulsion.prop_diameter_inch', p.propulsion.prop_diameter_inch]], `套用 ${a.name} 的比例`);
  };
  return (
    <section className="panel p-4" aria-label="参考机型" data-testid="references">
      <div className="flex items-baseline gap-2">
        <h3 className="panel-title">参考机型</h3>
        <span className="eyebrow">Real aircraft</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">官方规格与手册图面量测。{aircraftNote}</p>
      <ul className="mt-2 divide-y divide-line">
        {aircraft.map(a => {
          const dd = ddOf(a), on = pinned?.label === a.name;
          return (
            <li key={a.id} className="flex items-center gap-2 py-1.5" data-ref={a.id}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{a.maker} {a.name}{a.note && <span className="ml-1 text-[11px] font-normal text-ink-faint">{a.note}</span>}</div>
                <div className="num text-[11px] text-ink-soft">
                  {a.weight_g} g{a.wheelbase_mm ? ` · 轴距 ${a.wheelbase_mm}` : ''}{a.wl ? ` · W/L ${a.wl.toFixed(2)}` : ''}{dd ? ` · d/D ${dd.toFixed(2)}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => setGhost(a.name, on ? null : aircraftParameters(a, parameters))} aria-pressed={on} title="把它的电机布局叠到画布上"
                className={`rounded-lg p-1.5 ${on ? 'bg-amber-100 text-amber-700' : 'text-ink-faint hover:bg-canvas hover:text-ink'}`}><Layers className="h-4 w-4" /></button>
              <button type="button" onClick={() => apply(a)} title="套用它的横纵比（以及公布的轴距、桨径）" data-action="apply"
                className="rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"><Wand2 className="h-4 w-4" /></button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default References;
