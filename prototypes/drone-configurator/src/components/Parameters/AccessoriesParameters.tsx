import React from 'react';
import { Camera } from 'lucide-react';
import { useDroneStore } from '../../store/droneStore';
import { cameraMountOptions, colourName, colourSwatches, finishOptions } from '../../design/fields';
import { Choice, Field, Group, OpenChoice, TabHeading } from '../controls/controls';

const AccessoriesParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const a = parameters.accessories;
  const swatch = (active: boolean) => `rounded-lg border p-1.5 text-center ${active ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-slate-300 hover:border-primary-500'}`;
  return (
    <div className="space-y-6">
      <TabHeading icon={<Camera className="h-5 w-5 text-primary-600" />} title="配件与外观" en="Accessories & Finish">相机、颜色和表面。颜色与表面可以不指定。</TabHeading>

      <Field path="accessories.has_camera_gimbal" en="Camera" value={a.has_camera_gimbal ? '装相机' : '不装'}
        hint="相机装在机头、朝正前方。俯视时镜头会被机鼻挡住，切到「侧视」能看到它。">
        <Choice options={[{ value: 'yes', zh: '装前视相机' }, { value: 'no', zh: '不装相机' }]}
          value={a.has_camera_gimbal ? 'yes' : 'no'} onChange={v => setField('accessories.has_camera_gimbal', v === 'yes')} label="前视相机" />
      </Field>

      {a.has_camera_gimbal && (
        <Field path="accessories.camera_mount" en="Camera Mount">
          <OpenChoice path="accessories.camera_mount" options={cameraMountOptions} />
        </Field>
      )}

      <Group title="外观" note="可以不指定，留给后续设计">
        <Field path="accessories.drone_primary_color" en="Primary Color" value={a.drone_primary_color ? `${colourName(a.drone_primary_color)?.zh ?? '自定义'} ${a.drone_primary_color}` : '不指定'}>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="主色">
            <button type="button" role="radio" aria-checked={a.drone_primary_color === ''} onClick={() => setField('accessories.drone_primary_color', '')} className={swatch(a.drone_primary_color === '')}>
              <span className="block h-7 rounded border border-dashed border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_4px,#e2e8f0_4px,#e2e8f0_6px)]" />
              <span className="mt-1 block text-xs text-slate-600">不指定</span>
            </button>
            {colourSwatches.map(c => (
              <button key={c.value} type="button" role="radio" aria-checked={a.drone_primary_color === c.value} title={c.value}
                data-colour={c.value} onClick={() => setField('accessories.drone_primary_color', c.value)} className={swatch(a.drone_primary_color === c.value)}>
                <span className="block h-7 rounded border border-slate-200" style={{ backgroundColor: c.value }} />
                <span className="mt-1 block text-xs text-slate-600">{c.zh}</span>
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <input type="color" value={a.drone_primary_color || '#8a9095'} onChange={e => setField('accessories.drone_primary_color', e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-slate-300" aria-label="自定义颜色" />
            自定义颜色
          </label>
        </Field>

        <Field path="accessories.surface_finish" en="Surface Finish">
          <OpenChoice path="accessories.surface_finish" options={finishOptions} />
        </Field>
      </Group>

      <Group title="补充描述" note="字典里没有的想法，写在这里">
        <Field path="accessories.custom_prompt_additions" en="Custom Additions" hint="会原样加在提示词末尾。">
          <textarea value={a.custom_prompt_additions} onChange={e => setField('accessories.custom_prompt_additions', e.target.value)} rows={3}
            placeholder="例如：机身两侧保留连续的曲肩。"
            className="input-field w-full resize-y text-sm" />
        </Field>
      </Group>
    </div>
  );
};

export default AccessoriesParameters;
