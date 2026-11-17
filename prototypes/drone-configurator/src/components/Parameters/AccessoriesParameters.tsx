import React from 'react';
import { useDroneStore } from '../../store/droneStore';
import { cameraMountOptions, colourSwatches, finishOptions } from '../../design/fields';
import { Field, OpenChoice, Segmented, TabIntro } from '../controls/controls';

const AccessoriesParameters: React.FC = () => {
  const { parameters, setField } = useDroneStore();
  const a = parameters.accessories;
  return (
    <div className="space-y-3">
      <TabIntro title="配件">相机、颜色、表面处理和补充文字。相机怎样装、用什么颜色和表面，都由设计者决定，可以留白。</TabIntro>

      <Field path="accessories.has_camera_gimbal" hint="航拍相机朝机头前方，这是任务固定条件。从正上方看，镜头可以被机鼻遮住；镜片不会画在机背上。">
        <Segmented options={[{ value: 'yes', zh: '装前视相机' }, { value: 'no', zh: '不装相机' }]}
          value={a.has_camera_gimbal ? 'yes' : 'no'} onChange={v => setField('accessories.has_camera_gimbal', v === 'yes')} />
      </Field>

      {a.has_camera_gimbal && (
        <Field path="accessories.camera_mount" hint="留白时，顶视图在机鼻处用带问号的虚线框标出“相机在这里、可被遮挡”，侧视示意画出朝前的视线。">
          <OpenChoice path="accessories.camera_mount" options={cameraMountOptions} columns={1} />
        </Field>
      )}

      <Field path="accessories.drone_primary_color" hint="留白时示意图用斜线填充机身，提示词不出现任何颜色。">
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="主色">
          <button type="button" role="radio" aria-checked={a.drone_primary_color === ''} onClick={() => setField('accessories.drone_primary_color', '')}
            className={`rounded-md border p-1 text-center ${a.drone_primary_color === '' ? 'border-primary-600 ring-2 ring-primary-500/30' : 'border-slate-300 hover:border-primary-500'}`}>
            <span className="block h-6 rounded border border-dashed border-amber-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_3px,#fde68a_3px,#fde68a_5px)]" />
            <span className="mt-0.5 block text-[11px] text-slate-600">留白</span>
          </button>
          {colourSwatches.map(c => (
            <button key={c.value} type="button" role="radio" aria-checked={a.drone_primary_color === c.value} title={c.value}
              onClick={() => setField('accessories.drone_primary_color', c.value)}
              className={`rounded-md border p-1 text-center ${a.drone_primary_color === c.value ? 'border-primary-600 ring-2 ring-primary-500/30' : 'border-slate-300 hover:border-primary-500'}`}>
              <span className="block h-6 rounded border border-slate-200" style={{ backgroundColor: c.value }} />
              <span className="mt-0.5 block text-[11px] text-slate-600">{c.zh}</span>
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <input type="color" value={a.drone_primary_color || '#8a9095'} onChange={e => setField('accessories.drone_primary_color', e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-slate-300" aria-label="自定义颜色" />
          自定义颜色{a.drone_primary_color && `：${a.drone_primary_color}`}
        </label>
      </Field>

      <Field path="accessories.surface_finish" hint="表面处理由设计者决定。留白时提示词不写这一项。">
        <OpenChoice path="accessories.surface_finish" options={finishOptions} columns={3} />
      </Field>

      <Field path="accessories.custom_prompt_additions" hint="这里写的话会原样加在提示词末尾，并标为“你的补充”。如果写了护圈、颜色或碳纹，自检会注明它来自这段文字。">
        <textarea value={a.custom_prompt_additions} onChange={e => setField('accessories.custom_prompt_additions', e.target.value)} rows={3}
          placeholder="用来补充委托或说明某次修改，例如：臂根处加一道细的橙色识别线。"
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
      </Field>
    </div>
  );
};

export default AccessoriesParameters;
