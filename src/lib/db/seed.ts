import { db, uid } from "./db";
import { AXES_ORDRE, type LigneBudget, type ReferenceBudgetFile } from "./types";

/**
 * Transforme le fichier reference-budget.json (produit par
 * scripts/extract_reference.py) en lignes LigneBudget prêtes à insérer.
 */
export function parseReferenceFile(data: ReferenceBudgetFile): LigneBudget[] {
  const annee = typeof data.annee === "number" ? data.annee : new Date().getFullYear();
  const lignes: LigneBudget[] = [];

  for (const axe of AXES_ORDRE) {
    const entries = data[axe];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      lignes.push({
        id: uid(),
        annee,
        axe,
        poste: entry.poste,
        categorie: entry.categorie,
        prevu: entry.prevu,
      });
    }
  }
  return lignes;
}

/**
 * Remplace intégralement le Prévisionnel de l'année contenue dans le fichier.
 * Les mouvements déjà saisis ne sont jamais touchés.
 */
export async function importerReference(data: ReferenceBudgetFile): Promise<number> {
  const lignes = parseReferenceFile(data);
  const annee = lignes[0]?.annee ?? (typeof data.annee === "number" ? data.annee : new Date().getFullYear());

  await db.transaction("rw", db.lignesBudget, async () => {
    await db.lignesBudget.where("annee").equals(annee).delete();
    await db.lignesBudget.bulkAdd(lignes);
  });

  return lignes.length;
}

/** Charge le seed initial (public/reference-budget.json) si la base est vide. */
export async function amorcerSiVide(): Promise<void> {
  const count = await db.lignesBudget.count();
  if (count > 0) return;

  try {
    const res = await fetch(import.meta.env.BASE_URL + "reference-budget.json");
    if (!res.ok) return;
    const data = (await res.json()) as ReferenceBudgetFile;
    await importerReference(data);
  } catch (err) {
    console.error("Impossible de charger le budget de référence initial", err);
  }
}
