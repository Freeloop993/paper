// 重放复核：把留存的导出配置读回当前源码，再导出一次，核对提示词、轴心、选择状态和意图是否逐项相同。
// 运行：npm run replay [导出目录]。用于确认“留存的导出件”与“当前源码”对得上。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { buildExport, parseImported } from '../src/design/exporters.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../review/20261117-round1/exports'));
const defaults = {
  frame: { frame_type: 'True X', wheelbase_mm: 250, span_ratio_wl: 1, arm_thickness_mm: '4mm', arm_width_mm: '15mm', material_visual: '', arm_root: '' },
  propulsion: { prop_diameter_inch: 5, prop_blade_count: '2叶', motor_tilt_degree: 0, prop_guard: 'none' },
  fuselage: { fuselage_style: '', top_cover: '', fuselage_dimensions_mm: { length: 100, width: 80, height: 30 } },
  landing_gear: { landing_gear_style: '低矮滑撬/支腿', landing_gear_height_mm: 40 },
  accessories: { has_camera_gimbal: true, camera_mount: '', custom_prompt_additions: '', drone_primary_color: '', surface_finish: '' },
};
let failed = 0, count = 0;
for (const step of readdirSync(root).sort()) {
  const dir = join(root, step);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir).filter(f => /^drone-config-.*\.json$/.test(f))) {
    const saved = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const again = buildExport(parseImported(saved, defaults), { note: saved.export_note, stamp: file.replace(/^drone-config-|\.json$/g, '') });
    const same = key => JSON.stringify(saved[key]) === JSON.stringify(again[key]);
    const txt = readFileSync(join(dir, saved.files.prompt), 'utf8');
    const checks = {
      提示词全文: saved.prompt.text === again.prompt.text && txt === again.prompt.text,
      逐句来源: JSON.stringify(saved.prompt.sentences) === JSON.stringify(again.prompt.sentences),
      轴心与比例: same('layout'), 参数: same('parameters'), 选择状态: same('selection_status'), 留白项: same('open_decisions'),
      意图与证据卡: same('intent'), 条件图摘要: saved.reference_image.layout_sha256 === again.reference_image.layout_sha256,
    };
    const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    count++; if (bad.length) failed++;
    console.log(`${bad.length ? '不符' : '相同'}  ${step}/${file}${bad.length ? '  —  ' + bad.join('、') : ''}`);
  }
}
console.log(`\n重放 ${count} 份配置，${count - failed} 份与当前源码的输出逐项相同，${failed} 份不符`);
process.exit(failed ? 1 : 0);
