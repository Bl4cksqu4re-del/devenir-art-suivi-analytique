import type { LigneBudget, Mouvement } from "./types";

export interface Agregat {
  prevu: number;
  realise: number;
  ecart: number;
  pct: number; // % du prévisionnel consommé (0-100+, peut dépasser 100)
}

export function agreger(prevu: number, realise: number): Agregat {
  const ecart = prevu - realise;
  const pct = prevu > 0 ? (realise / prevu) * 100 : realise > 0 ? Infinity : 0;
  return { prevu, realise, ecart, pct };
}

export interface AxeAgregat extends Agregat {
  axe: string;
}

export interface PosteAgregat extends Agregat {
  axe: string;
  poste: string;
}

export interface CategorieAgregat extends Agregat {
  axe: string;
  poste: string;
  groupe: string | null;
  categorie: string;
}

/** Un mouvement compte dans le Réalisé seulement une fois confirmé — une
 * échéance récurrente générée à l'avance (confirme === false) n'y figure
 * pas tant qu'elle n'a pas été validée (date/montant ajustés si besoin). */
export function estConfirme(m: Mouvement): boolean {
  return m.confirme !== false;
}

function sommeRealiseParClef(mouvements: Mouvement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of mouvements) {
    if (!estConfirme(m)) continue;
    const clef = `${m.axe} ${m.poste} ${m.categorie}`;
    map.set(clef, (map.get(clef) ?? 0) + m.montant);
  }
  return map;
}

export function agregerParCategorie(lignes: LigneBudget[], mouvements: Mouvement[]): CategorieAgregat[] {
  const realiseParClef = sommeRealiseParClef(mouvements);
  const consommees = new Set<string>();

  const resultats: CategorieAgregat[] = lignes.map((l) => {
    const clef = `${l.axe} ${l.poste} ${l.categorie}`;
    consommees.add(clef);
    const realise = realiseParClef.get(clef) ?? 0;
    return { axe: l.axe, poste: l.poste, groupe: l.groupe, categorie: l.categorie, ...agreger(l.prevu, realise) };
  });

  // Mouvements saisis sur une catégorie qui n'existe plus dans la référence
  // (ex. référence changée en cours d'année) : on les fait quand même apparaître,
  // avec un Prévisionnel à 0, plutôt que de perdre du Réalisé silencieusement.
  for (const [clef, realise] of realiseParClef) {
    if (consommees.has(clef)) continue;
    const [axe, poste, categorie] = clef.split(" ");
    resultats.push({ axe, poste, groupe: null, categorie, ...agreger(0, realise) });
  }

  return resultats;
}

export function agregerParPoste(categories: CategorieAgregat[]): PosteAgregat[] {
  const map = new Map<string, PosteAgregat>();
  for (const c of categories) {
    const clef = `${c.axe} ${c.poste}`;
    const courant = map.get(clef);
    if (courant) {
      courant.prevu += c.prevu;
      courant.realise += c.realise;
    } else {
      map.set(clef, { axe: c.axe, poste: c.poste, prevu: c.prevu, realise: c.realise, ecart: 0, pct: 0 });
    }
  }
  for (const p of map.values()) {
    const a = agreger(p.prevu, p.realise);
    p.ecart = a.ecart;
    p.pct = a.pct;
  }
  return [...map.values()];
}

export interface GroupeAgregat extends Agregat {
  axe: string;
  poste: string;
  groupe: string;
}

/** Sous-totaux par regroupement intermédiaire (ex. "Déplacement, voyages"),
 * tel que défini dans le classeur source — ignore les catégories qui sont
 * des enfants directs du poste (groupe === null). */
export function agregerParGroupe(categories: CategorieAgregat[]): GroupeAgregat[] {
  const map = new Map<string, GroupeAgregat>();
  for (const c of categories) {
    if (!c.groupe) continue;
    const clef = `${c.axe} ${c.poste} ${c.groupe}`;
    const courant = map.get(clef);
    if (courant) {
      courant.prevu += c.prevu;
      courant.realise += c.realise;
    } else {
      map.set(clef, { axe: c.axe, poste: c.poste, groupe: c.groupe, prevu: c.prevu, realise: c.realise, ecart: 0, pct: 0 });
    }
  }
  for (const g of map.values()) {
    const a = agreger(g.prevu, g.realise);
    g.ecart = a.ecart;
    g.pct = a.pct;
  }
  return [...map.values()];
}

export function agregerParAxe(categories: CategorieAgregat[]): AxeAgregat[] {
  const map = new Map<string, AxeAgregat>();
  for (const c of categories) {
    const courant = map.get(c.axe);
    if (courant) {
      courant.prevu += c.prevu;
      courant.realise += c.realise;
    } else {
      map.set(c.axe, { axe: c.axe, prevu: c.prevu, realise: c.realise, ecart: 0, pct: 0 });
    }
  }
  for (const a of map.values()) {
    const agr = agreger(a.prevu, a.realise);
    a.ecart = agr.ecart;
    a.pct = agr.pct;
  }
  return [...map.values()];
}

export function agregerGlobal(axes: AxeAgregat[]): Agregat {
  const prevu = axes.reduce((s, a) => s + a.prevu, 0);
  const realise = axes.reduce((s, a) => s + a.realise, 0);
  return agreger(prevu, realise);
}

export interface PointTendance {
  date: string; // ISO yyyy-mm-dd
  cumulRealise: number;
  cumulPrevuTheorique: number;
}

/**
 * Série cumulée jour par jour, du 1er janvier à aujourd'hui (ou au dernier
 * mouvement si postérieur), avec en regard le Prévisionnel théorique
 * cumulé si le budget annuel était consommé de façon linéaire.
 */
export function serieTendance(annee: number, prevuTotal: number, tousMouvements: Mouvement[]): PointTendance[] {
  const mouvements = tousMouvements.filter(estConfirme);
  const debut = new Date(Date.UTC(annee, 0, 1));
  const finAnnee = new Date(Date.UTC(annee, 11, 31));
  const aujourdHui = new Date();
  const dernierMouvement = mouvements.reduce<Date | null>((max, m) => {
    const d = new Date(m.date + "T00:00:00Z");
    return !max || d > max ? d : max;
  }, null);

  let fin = aujourdHui < finAnnee ? aujourdHui : finAnnee;
  if (dernierMouvement && dernierMouvement > fin) fin = dernierMouvement;
  if (fin < debut) fin = debut;

  const totalJoursAnnee = Math.round((finAnnee.getTime() - debut.getTime()) / 86_400_000) + 1;

  const montantsParJour = new Map<string, number>();
  for (const m of mouvements) {
    montantsParJour.set(m.date, (montantsParJour.get(m.date) ?? 0) + m.montant);
  }

  const points: PointTendance[] = [];
  let cumul = 0;
  const nbJours = Math.round((fin.getTime() - debut.getTime()) / 86_400_000) + 1;

  for (let i = 0; i < nbJours; i++) {
    const jour = new Date(debut.getTime() + i * 86_400_000);
    const iso = jour.toISOString().slice(0, 10);
    cumul += montantsParJour.get(iso) ?? 0;
    const cumulPrevuTheorique = totalJoursAnnee > 0 ? (prevuTotal * (i + 1)) / totalJoursAnnee : 0;
    points.push({ date: iso, cumulRealise: cumul, cumulPrevuTheorique });
  }

  return points;
}
