// 参考机型：仓库里已核的真实航拍四旋。可以把某一款的电机布局叠到画布上对比，或直接套用它的比例。
import React from 'react';
import { Layers, Wand2 } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { aircraft, aircraftNote, aircraftParameters, ddOf, type Aircraft } from '../../data/aircraft';

import { layoutKey, usesConsumerReferences } from '../../design/design';

const layoutSources = {
  tri: { title: 'TriMorph · 展开三旋', note: '同一原型展开与收拢的照片，可对照三个轴位。当前资料不足以确定三旋机型的比例区间。', href: 'https://www.imavs.org/pdf/imav.2026.8#page=5' },
  flat_hex: { title: 'DJI S900 · 平面六旋', note: '手册第 10 页标明机头及六个轴位，可用于顶视计数。', href: 'https://dl.djicdn.com/downloads/s900/en/S900_User_Manual_en_v1.4.pdf#page=10' },
  flat_octo: { title: 'DJI S1000+ · 平面八旋', note: '手册第 10 页标有八个轴位及展开方向，供独立读图对照。', href: 'https://dl.djicdn.com/downloads/s1000_plus/en/S1000%EF%BC%8B_User_Manual_en_v1.4.pdf#page=10' },
  coax_hex: { title: 'Brouwer 等 · 共轴 Y6', note: '图 1b 中的侧斜视能辨别同一轴位的上下桨。', href: 'https://www.vliz.be/imisdocs/publications/77/271477.pdf#page=3' },
  coax_octo: { title: 'DJI T40 · 共轴 X8', note: '手册第 8 页呈现展开与折叠状态，供上下层及轴位判读。', href: 'https://dl.djicdn.com/downloads/t40_t20p/20221021multi/T40_T20P_User_Manual_v1.0_EN.pdf#page=8' },
};
const agriculturalHex = { title: 'DJI T20 · 植保六旋', note: '手册第 13 页呈现展开与折叠外观。可核植保机的使用情境与轴位，立体图不用于顶视尺度标定。', href: 'https://dl.djicdn.com/downloads/t20/20201201/Agras_T20_User_Manual_v1.4_EN.pdf#page=13' };

const References: React.FC = () => {
  const { parameters, intent, pinned, setGhost, setField, setMany } = useDroneStore();
  const key = layoutKey(parameters.frame.frame_type);
  if (!usesConsumerReferences(parameters.frame.frame_type, intent.taskId)) {
    const source = key === 'quad' ? null : key === 'flat_hex' && intent.taskId === 'agricultural_spraying' ? agriculturalHex : layoutSources[key];
    return <section className="panel p-4" aria-label="构型资料">
      <h3 className="panel-title">构型资料</h3>
      {source ? <>
        <a className="mt-3 block text-sm font-medium text-primary-600 hover:underline" href={source.href} target="_blank" rel="noreferrer">{source.title} ↗</a>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">{source.note}</p>
      </> : <p className="mt-2 text-xs text-ink-soft">当前任务尚无已核对的同类机型比例。</p>}
    </section>;
  }
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
