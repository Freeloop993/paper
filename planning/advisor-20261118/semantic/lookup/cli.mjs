import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createLookup, vocabulary } from "./lookup.mjs";

const { values } = parseArgs({ options: {
  task: { type: "string" }, layout: { type: "string" }, topic: { type: "string" },
  state: { type: "string" }, component: { type: "string" }, cards: { type: "string" },
  vocabulary: { type: "boolean" }
} });

if (values.vocabulary) {
  console.log(JSON.stringify(vocabulary(), null, 2));
} else {
  const { cards, ...query } = values;
  let data;
  if (cards && /\.json$/i.test(cards)) {
    data = JSON.parse(readFileSync(cards, "utf8").replace(/^\uFEFF/, ""));
  } else {
    const reader = fileURLToPath(new URL("./read_cards.py", import.meta.url));
    const args = cards ? [reader, cards] : [reader];
    data = JSON.parse(execFileSync(process.env.PYTHON || "python", args, { encoding: "utf8" }));
  }
  const lookup = await createLookup(data);
  console.log(JSON.stringify(lookup(query), null, 2));
}
