// Input-side probe. Run with Node 24 and the PR #75 configurator source directory.
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.argv[2];
if (!root) throw new Error('Usage: node probe-layout.mjs <PR75 configurator directory> [--check]');
const src = resolve(root);
const { parseImported, buildExport } = await import(pathToFileURL(join(src, 'src/design/exporters.ts')).href);
const fixture = join(src, 'review/20261118-round3/exports/01-true-x-goal-compact/drone-config-20261118-010543.json');
const exported = JSON.parse(await readFile(fixture, 'utf8'));

const results = [];
for (const frame of ['True X', 'Radial Hex']) {
  const input = parseImported(structuredClone(exported), structuredClone(exported.parameters));
  input.parameters.frame.frame_type = frame;
  const result = buildExport(input, {note: 'Input-side replay; no model call', stamp: 'replay'});
  const task = result.task_fixed.find(field => field.label === '设计任务')?.value ?? '';
  const firstSentence = result.prompt.sentences[0].text;
  const axes = result.layout.hubs.length;
  const expected = frame === 'True X' ? 4 : 6;
  const taskMatches = expected === 4 ? task.includes('四旋') : task.includes('六旋');
  const promptMatches = expected === 4 ? /quad(copter|rotor)/i.test(firstSentence) : /hex(a?copter|a?rotor)/i.test(firstSentence);
  results.push({ frame, axes, task, firstSentence, match: axes === expected && taskMatches && promptMatches });
}
console.log(JSON.stringify(results, null, 2));
if (process.argv.includes('--check') && results.some(row => !row.match)) process.exitCode = 1;
