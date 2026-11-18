// Replays checked design fields against the existing public structured retriever.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = resolve(process.argv[2] || '.');
const { createLookup } = await import(pathToFileURL(resolve(repository, 'planning/advisor-20261118/semantic/lookup/lookup.mjs')));
const cards = JSON.parse(readFileSync(resolve(repository, 'prototypes/drone-configurator/src/data/evidenceCards.json'), 'utf8'));
const lookup = await createLookup(cards);
const sourceForCard = new Map(cards.cards.map(card => [card.id, card.source_key]));
const controls = readFileSync(new URL('./development-probes.jsonl', import.meta.url), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
const roles = ['example', 'caution', 'context'];
const outcomes = {};
const results = [];
for (const item of controls) {
  const result = lookup(item.fields);
  const expected = item.expected;
  const flat = result.groups.flatMap(group => group.cards);
  assert.equal(result.status, expected.status, item.id);
  assert.deepEqual(result.parameterChanges, [], item.id);
  for (const role of roles) {
    const returned = flat.filter(card => card.role === role).map(card => card.id).sort();
    assert.deepEqual(returned, [...expected[role]].sort(), item.id + ' ' + role);
  }
  assert.equal(flat.length, roles.reduce((n, role) => n + expected[role].length, 0), item.id);
  const expectedGroups = new Set(roles.flatMap(role => expected[role]).map(id => sourceForCard.get(id)));
  assert.equal(result.groups.length, expectedGroups.size, item.id);
  for (const group of result.groups) {
    assert.ok(group.cards.every(card => sourceForCard.get(card.id) === group.source));
  }
  outcomes[result.status] = (outcomes[result.status] || 0) + 1;
  results.push({ id: item.id, decision: result.status, returnedCards: flat.map(c => c.id), sourceGroups: result.groups.length });
}
assert.equal(new Set(controls.map(item => item.id)).size, controls.length);
console.log(JSON.stringify({
  input: 'researcher-specified fields; prose supplied for human reading', controls: controls.length,
  outcomes, independentJudgments: 0, modelCalls: 0, results
}, null, 2));
