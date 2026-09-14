import { db, uid } from "./db";
import { estManuelle } from "./aggregate";
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
        nature: "charge",
        axe,
        poste: entry.poste,
        groupe: entry.groupe ?? null,
        categorie: entry.categorie,
        prevu: entry.prevu,
        origine: "classeur",
      });
    }
  }

  if (Array.isArray(data.Recettes)) {
    for (const entry of data.Recettes) {
      lignes.push({
        id: uid(),
        annee,
        nature: "produit",
        axe: null,
        poste: entry.poste,
        groupe: entry.groupe ?? null,
        categorie: entry.categorie,
        prevu: entry.prevu,
        origine: "classeur",
      });
    }
  }

  return lignes;
}

/**
 * Remplace le Prévisionnel de l'année contenue dans le fichier par celui du
 * classeur. Les mouvements déjà saisis ne sont jamais touchés, et les
 * catégories ajoutées à la main dans l'app (origine "manuelle") sont
 * préservées telles quelles — seules celles venant du classeur sont
 * remplacées.
 */
export async function importerReference(data: ReferenceBudgetFile): Promise<number> {
  const lignes = parseReferenceFile(data);
  const annee = lignes[0]?.annee ?? (typeof data.annee === "number" ? data.annee : new Date().getFullYear());

  await db.transaction("rw", db.lignesBudget, async () => {
    const existantes = await db.lignesBudget.where("annee").equals(annee).toArray();
    const manuelles = existantes.filter(estManuelle);
    await db.lignesBudget.where("annee").equals(annee).delete();
    await db.lignesBudget.bulkAdd([...lignes, ...manuelles]);
  });

  return lignes.length;
}

/**
 * Ajoute une catégorie créée à la main depuis l'app (pas dans le classeur
 * source) — préservée lors d'un futur ré-import de reference-budget.json.
 */
export async function ajouterCategorieManuelle(
  ligne: Omit<LigneBudget, "id" | "origine">,
): Promise<LigneBudget> {
  const categorieNormalisee = ligne.categorie.trim();
  if (!categorieNormalisee) {
    throw new Error("Le nom de la catégorie est requis.");
  }

  const memeAnnee = await db.lignesBudget.where("annee").equals(ligne.annee).toArray();
  const existeDeja = memeAnnee.some(
    (l) =>
      l.axe === ligne.axe &&
      l.poste === ligne.poste &&
      l.categorie.trim().toLowerCase() === categorieNormalisee.toLowerCase(),
  );
  if (existeDeja) {
    throw new Error("Cette catégorie existe déjà pour cet axe et ce poste.");
  }

  const nouvelle: LigneBudget = {
    ...ligne,
    categorie: categorieNormalisee,
    id: uid(),
    origine: "manuelle",
  };
  await db.lignesBudget.add(nouvelle);
  return nouvelle;
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
