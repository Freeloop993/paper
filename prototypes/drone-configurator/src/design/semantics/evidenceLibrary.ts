import { useEffect, useState } from 'react';
import evidence from '../../data/evidenceCards.json';
import { createLookup, type LookupResult, type SemanticQuery } from './lookup.mjs';
import { createEvidenceSearch } from './evidenceSearch';
import type { BriefDecision } from './brief';

function openLibrary() {
  return createLookup(evidence).then(lookup => ({ lookup, ...createEvidenceSearch(evidence.cards) }));
}
type Library = Awaited<ReturnType<typeof openLibrary>>;
let pending: Promise<Library> | undefined;

export function useEvidenceLibrary() {
  const [library, setLibrary] = useState<Library>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    pending ??= openLibrary().catch(err => { pending = undefined; throw err; });
    pending.then(value => { if (mounted) setLibrary(value); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);
  return { library, error };
}

export function decisionSources(query: SemanticQuery, result?: LookupResult): Pick<BriefDecision,
  'query' | 'status' | 'sourceVersion' | 'corpus' | 'evidence' | 'hypotheses'> {
  return {
    query, status: result?.status ?? 'abstain', sourceVersion: result?.version ?? 'unavailable', corpus: result?.corpus ?? '',
    evidence: result?.groups.flatMap(group => group.cards.map(card => ({id:card.id, source:group.source, role:card.role}))) ?? [],
    hypotheses: result?.hypotheses.map(h => h.id) ?? [],
  };
}
