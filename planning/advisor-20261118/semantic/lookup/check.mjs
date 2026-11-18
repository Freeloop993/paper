import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createLookup, vocabulary } from "./lookup.mjs";

const reader = fileURLToPath(new URL("./read_cards.py", import.meta.url));
const canonical = JSON.parse(execFileSync(process.env.PYTHON || "python", [reader], { encoding: "utf8" }));
const lookup = await createLookup(canonical);
const reference = { task: "consumer_camera", layout: "quad" };
function run(topic, state, overrides = {}) {
  return lookup({ ...reference, topic, state, ...overrides });
}
function ids(result) {
  return result.groups.flatMap(group => group.cards.map(card => card.id));
}

const coverage = new Set();
const sources = new Set();
for (const topic of vocabulary().topics) {
  for (const { state, component } of topic.states) {
    const result = run(topic.id, state, { component });
    assert.deepEqual(result.parameterChanges, []);
    for (const group of result.groups) {
      sources.add(group.source);
      for (const card of group.cards) {
        coverage.add(card.id);
        assert.ok(card.quote && card.limits && card.record && card.source_key === group.source);
      }
    }
  }
}
assert.deepEqual([...coverage].sort(), canonical.cards.map(card => card.id).sort());
assert.equal(sources.size, 35);

const ambiguous = run("compactness", "unspecified");
assert.equal(ambiguous.status, "clarify");
assert.deepEqual(ids(ambiguous), ["E001"]);
assert.equal(ambiguous.choiceField, "state");
assert.equal(ambiguous.groups[0].cards[0].role, "context");
const folded = run("compactness", "folded");
assert.equal(folded.status, "retrieve");
assert.deepEqual(ids(folded), ["E009", "E008"]);
assert.equal(folded.groups[1].cards[0].role, "caution");
const pocket = run("pocket_fit", "carrying");
assert.deepEqual(ids(pocket), ["E003", "E004"]);
assert.equal(pocket.groups.length, 1);
assert.deepEqual(ids(run("accessory_outline", "with_accessory")), ["E007", "E006"]);
const unfolded = run("compactness", "unfolded_top");
assert.equal(unfolded.status, "abstain");
assert.deepEqual(ids(unfolded), []);
assert.equal(unfolded.hypotheses[0].status, "untested_perceptual_link");
for (const query of [
  { task: "agricultural_spraying" }, { layout: "tri" }, { layout: "flat_hex" },
  { layout: "flat_octo" }, { layout: "coax_hex" }, { layout: "coax_octo" },
  { layout: "unknown_layout" }, { component: "gimbal" }, { topic: "unknown_topic" }
]) {
  const result = run("compactness", "folded", query);
  assert.equal(result.status, "abstain");
  assert.deepEqual(ids(result), []);
  assert.deepEqual(result.hypotheses, []);
}
assert.equal(run("bag_fit", "unspecified").status, "clarify");
assert.equal(run("bag_fit", "unfolded_top").status, "abstain");
assert.deepEqual(ids(run("gimbal_cover", "unspecified")), ["E026"]);
assert.deepEqual(ids(run("assembly_mark", "unspecified")), ["E028"]);
assert.deepEqual(ids(run("blade_guard", "unspecified")), ["E020", "E021", "E022", "E023"]);
const changed = structuredClone(canonical);
changed.cards[0].quote += "x";
await assert.rejects(createLookup(changed), /不一致/);
folded.groups[0].cards[0].quote = "changed";
assert.notEqual(run("compactness", "folded").groups[0].cards[0].quote, "changed");

if (process.argv[2]) {
  const frontend = await createLookup(JSON.parse(readFileSync(process.argv[2], "utf8").replace(/^\uFEFF/, "")));
  for (const topic of vocabulary().topics) {
    for (const { state } of topic.states) {
      const query = { ...reference, topic: topic.id, state };
      assert.deepEqual(frontend(query), lookup(query));
    }
  }
}
console.log(JSON.stringify({
  developmentChecks: "passed", coveredCards: coverage.size, coveredSources: sources.size,
  topics: vocabulary().topics.length, pr75Compared: Boolean(process.argv[2]),
  humanSessions: 0, modelCalls: 0
}));
