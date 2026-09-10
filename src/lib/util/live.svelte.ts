import { onDestroy } from "svelte";
import { liveQuery } from "dexie";

/**
 * Adapte une requête Dexie réactive (liveQuery) en valeur "rune" ($state),
 * pour un usage direct dans un composant Svelte : `const mvts = useLiveQuery(...)`
 * puis `mvts.value` dans le template — se met à jour automatiquement à
 * chaque écriture dans IndexedDB, sans jamais stocker d'agrégat calculé.
 */
export function useLiveQuery<T>(querier: () => Promise<T> | T, valeurInitiale: T) {
  let valeur = $state(valeurInitiale);

  const sub = liveQuery(querier).subscribe({
    next: (v) => {
      valeur = v;
    },
    error: (err) => console.error("liveQuery", err),
  });

  onDestroy(() => sub.unsubscribe());

  return {
    get value() {
      return valeur;
    },
  };
}
