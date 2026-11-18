export type SemanticQuery = { task: string; layout: string; topic: string; state: string; component?: string };
export interface Card {
  id: string; quote: string; object: string; state: string; source_key: string; limits: string; relation: string; role: string;
}
export interface LookupResult {
  version: string; corpus: string; status: 'retrieve' | 'clarify' | 'abstain'; query: SemanticQuery;
  component?: string; reason: string; choices: string[]; choiceField: 'topic' | 'state' | null;
  groups: {source: string; cards: Card[]}[]; hypotheses: {id: string; description: string}[];
}
export function vocabulary(): { topics: {id: string; label: string; states: {state: string; component: string}[]}[] };
export function createLookup(envelope: unknown): Promise<(query: SemanticQuery) => LookupResult>;
